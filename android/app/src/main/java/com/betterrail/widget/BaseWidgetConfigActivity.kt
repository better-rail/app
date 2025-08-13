package com.betterrail.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.*
import com.betterrail.R
import android.util.Log
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.cache.WidgetCacheManager

abstract class BaseWidgetConfigActivity : Activity() {

    protected lateinit var originSpinner: Spinner
    protected lateinit var destinationSpinner: Spinner
    protected lateinit var addButton: Button
    protected lateinit var cancelButton: Button
    
    protected var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    protected lateinit var stationAdapter: ArrayAdapter<String>
    protected val stationIds = mutableListOf<String>()
    protected val stationNames = mutableListOf<String>()
    private val defaultRefreshIntervalMinutes = BaseWidgetProvider.DEFAULT_REFRESH_INTERVAL_MINUTES

    abstract fun getLogTag(): String
    abstract fun createWidgetProvider(): BaseWidgetProvider

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set the result to CANCELED in case the user backs out
        setResult(Activity.RESULT_CANCELED)
        
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
        // Debug: Log current locale and test Hebrew string resolution
        val currentLocale = resources.configuration.locales
        val testHebrew = getString(R.string.station_2300) // Should be "חיפה - חוף הכרמל" in Hebrew
        android.util.Log.d("WidgetConfig", "Current locale: $currentLocale")
        android.util.Log.d("WidgetConfig", "Test station_2300 resolves to: '$testHebrew'")
        
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
        val originSelected = originSpinner.selectedItemPosition > BaseWidgetProvider.INVALID_POSITION
        val destinationSelected = destinationSpinner.selectedItemPosition > BaseWidgetProvider.INVALID_POSITION
        val differentStations = originSpinner.selectedItemPosition != destinationSpinner.selectedItemPosition
        
        addButton.isEnabled = originSelected && destinationSelected && differentStations
    }
    
    private fun onAddButtonClicked() {
        try {
            Log.d(getLogTag(), "Add button clicked for widget $appWidgetId")
            
            val originPosition = originSpinner.selectedItemPosition
            val destinationPosition = destinationSpinner.selectedItemPosition
            
            if (originPosition <= BaseWidgetProvider.INVALID_POSITION || destinationPosition <= BaseWidgetProvider.INVALID_POSITION) {
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
            val refreshIntervalMinutes = defaultRefreshIntervalMinutes
            
            Log.d(getLogTag(), "Saving widget data: $originName -> $destinationName")
            
            // Check if this is a route change for existing widget
            val existingWidgetData = WidgetPreferences.getWidgetData(this, appWidgetId)
            val isRouteChange = existingWidgetData.originId.isNotEmpty() && 
                               (existingWidgetData.originId != originId || existingWidgetData.destinationId != destinationId)
            
            if (isRouteChange) {
                Log.d(getLogTag(), "Route change detected, clearing old cache for widget $appWidgetId")
                WidgetCacheManager.clearWidgetCache(this, appWidgetId)
            }
            
            val widgetData = WidgetData(
                originId = originId,
                destinationId = destinationId,
                originName = "", // Don't store localized names - look them up dynamically
                destinationName = "", // Don't store localized names - look them up dynamically  
                label = "",
                updateFrequencyMinutes = refreshIntervalMinutes
            )
            
            // Save widget configuration
            WidgetPreferences.saveWidgetData(this, appWidgetId, widgetData)
            
            // Notify the widget provider to update
            val widgetProvider = createWidgetProvider()
            widgetProvider.configureWidget(this, appWidgetId)
            
            // Return successful result
            val resultValue = Intent()
            resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            setResult(Activity.RESULT_OK, resultValue)
            
            Log.d(getLogTag(), "Widget $appWidgetId configured successfully")
            
            finish()
            
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error configuring widget $appWidgetId", e)
            Toast.makeText(this, "Error configuring widget", Toast.LENGTH_SHORT).show()
        }
    }
}
