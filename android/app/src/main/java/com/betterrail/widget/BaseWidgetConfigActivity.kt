package com.betterrail.widget

import androidx.appcompat.app.AppCompatActivity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.*
import com.betterrail.R
import android.util.Log
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import com.betterrail.widget.repository.ModernCacheRepository
import kotlinx.coroutines.*
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
abstract class BaseWidgetConfigActivity : AppCompatActivity() {

    @Inject
    lateinit var preferencesRepository: ModernWidgetPreferencesRepository
    
    @Inject
    lateinit var cacheRepository: ModernCacheRepository

    protected lateinit var originSpinner: Spinner
    protected lateinit var destinationSpinner: Spinner
    protected lateinit var addButton: Button
    protected lateinit var cancelButton: Button
    
    protected var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    protected lateinit var stationAdapter: ArrayAdapter<String>
    protected val stationIds = mutableListOf<String>()
    protected val stationNames = mutableListOf<String>()
    private val defaultRefreshIntervalMinutes = 15

    abstract fun getLogTag(): String
    abstract fun createWidgetProvider(): ModernBaseWidgetProvider

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set the result to CANCELED in case the user backs out
        setResult(RESULT_CANCELED)
        
        setContentView(R.layout.activity_widget_config)
        
        // Find the widget id from the intent
        val intent = intent
        val extras = intent.extras
        if (extras != null) {
            appWidgetId = extras.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            )
        }

        // If this activity was started with an intent without an app widget ID, finish with an error
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }
        
        setupUI()
        setupStationData()
    }
    
    private fun setupUI() {
        originSpinner = findViewById(R.id.origin_spinner)
        destinationSpinner = findViewById(R.id.destination_spinner)
        addButton = findViewById(R.id.add_button)
        cancelButton = findViewById(R.id.cancel_button)
        
        addButton.setOnClickListener { onAddButtonClicked() }
        cancelButton.setOnClickListener { finish() }
    }
    
    private fun setupStationData() {       
        // Get stations for display (will use system locale for proper language)
        val stationsForDisplay = StationsData.getStationsForDisplay(this)
        
        // Clear lists
        stationIds.clear()
        stationNames.clear()
        
        // Add "Select Station" as first option
        stationIds.add("")
        stationNames.add(getString(R.string.select_station))
        
        // Add all stations
        stationsForDisplay.forEach { (id, name) ->
            stationIds.add(id)
            stationNames.add(name)
        }
        
        // Create adapter
        stationAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            stationNames
        )
        stationAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        
        // Set adapters
        originSpinner.adapter = stationAdapter
        destinationSpinner.adapter = stationAdapter
        
        // Set listeners to update button state
        originSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: android.view.View?, position: Int, id: Long) {
                updateAddButtonState()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
        
        destinationSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: android.view.View?, position: Int, id: Long) {
                updateAddButtonState()
            }
            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }
    }
    
    
    private fun updateAddButtonState() {
        val originSelected = originSpinner.selectedItemPosition > 0
        val destinationSelected = destinationSpinner.selectedItemPosition > 0
        val differentStations = originSpinner.selectedItemPosition != destinationSpinner.selectedItemPosition
        
        addButton.isEnabled = originSelected && destinationSelected && differentStations
    }
    
    private fun onAddButtonClicked() {
        try {
            Log.d(getLogTag(), "Add button clicked for widget $appWidgetId")
            
            val originPosition = originSpinner.selectedItemPosition
            val destinationPosition = destinationSpinner.selectedItemPosition
            
            if (originPosition <= 0 || destinationPosition <= 0) {
                Toast.makeText(this, "Please select both origin and destination stations", Toast.LENGTH_SHORT).show()
                return
            }
            
            if (originPosition == destinationPosition) {
                Toast.makeText(this, "Origin and destination must be different", Toast.LENGTH_SHORT).show()
                return
            }
            
            val originId = stationIds[originPosition]
            val destinationId = stationIds[destinationPosition]
            val originName = stationNames[originPosition]
            val destinationName = stationNames[destinationPosition]
            
            Log.d(getLogTag(), "Saving widget data: $originName -> $destinationName")
            
            // Use coroutine for async operations
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    // Check if this is a route change for existing widget
                    val existingWidgetData = preferencesRepository.getWidgetData(appWidgetId)
                    val isRouteChange = existingWidgetData != null && 
                                       (existingWidgetData.originId != originId || existingWidgetData.destinationId != destinationId)
                    
                    if (isRouteChange) {
                        Log.d(getLogTag(), "Route change detected, clearing old cache for widget $appWidgetId")
                        cacheRepository.clearWidgetCache(appWidgetId)
                    }
                    
                    val widgetData = WidgetData(
                        originId = originId,
                        destinationId = destinationId,
                        originName = "", // Don't store localized names - look them up dynamically
                        destinationName = "", // Don't store localized names - look them up dynamically  
                        label = "",
                        updateFrequencyMinutes = defaultRefreshIntervalMinutes
                    )
                    
                    // Save widget configuration
                    preferencesRepository.saveWidgetData(appWidgetId, widgetData)
                    
                    // Trigger widget update by sending broadcast to the modern widget provider
                    val appWidgetManager = AppWidgetManager.getInstance(this@BaseWidgetConfigActivity)
                    val widgetProvider = createWidgetProvider()
                    
                    // Create an update intent for the specific widget provider
                    val updateIntent = Intent(this@BaseWidgetConfigActivity, widgetProvider::class.java).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                    }
                    sendBroadcast(updateIntent)
                    
                    // Return successful result
                    val resultValue = Intent()
                    resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                    setResult(RESULT_OK, resultValue)
                    
                    Log.d(getLogTag(), "Widget $appWidgetId configured successfully")
                    
                    finish()
                    
                } catch (e: Exception) {
                    Log.e(getLogTag(), "Error configuring widget $appWidgetId", e)
                    Toast.makeText(this@BaseWidgetConfigActivity, "Error configuring widget", Toast.LENGTH_SHORT).show()
                }
            }
            
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error setting up widget configuration", e)
            Toast.makeText(this, "Error configuring widget", Toast.LENGTH_SHORT).show()
        }
    }
}
