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

class WidgetConfigActivity : Activity() {

    private lateinit var originSpinner: Spinner
    private lateinit var destinationSpinner: Spinner
    private lateinit var refreshIntervalSpinner: Spinner
    private lateinit var labelEditText: EditText
    private lateinit var addButton: Button
    private lateinit var cancelButton: Button
    
    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var stationAdapter: ArrayAdapter<String>
    private val stationIds = mutableListOf<String>()
    private val stationNames = mutableListOf<String>()
    private val refreshIntervalValues = listOf(5, 10, 15, 30, 60)

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
        setupRefreshIntervalData()
    }
    
    private fun setupUI() {
        originSpinner = findViewById(R.id.origin_spinner)
        destinationSpinner = findViewById(R.id.destination_spinner)
        refreshIntervalSpinner = findViewById(R.id.refresh_interval_spinner)
        labelEditText = findViewById(R.id.label_edit_text)
        addButton = findViewById(R.id.add_button)
        cancelButton = findViewById(R.id.cancel_button)
        
        addButton.setOnClickListener { onAddButtonClicked() }
        cancelButton.setOnClickListener { finish() }
    }
    
    private fun setupStationData() {
        // Get stations for display (using English names)
        val stationsForDisplay = StationsData.getStationsForDisplay("english")
        
        // Clear lists
        stationIds.clear()
        stationNames.clear()
        
        // Add "Select Station" as first option
        stationIds.add("")
        stationNames.add("Select Station")
        
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
    
    
    private fun setupRefreshIntervalData() {
        val refreshOptions = listOf("5 minutes", "10 minutes", "15 minutes", "30 minutes", "1 hour")
        
        val refreshAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            refreshOptions
        )
        refreshAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        refreshIntervalSpinner.adapter = refreshAdapter
        
        // Default to 10 minutes (index 1)
        refreshIntervalSpinner.setSelection(1)
    }
    
    private fun updateAddButtonState() {
        val originSelected = originSpinner.selectedItemPosition > 0
        val destinationSelected = destinationSpinner.selectedItemPosition > 0
        val differentStations = originSpinner.selectedItemPosition != destinationSpinner.selectedItemPosition
        
        addButton.isEnabled = originSelected && destinationSelected && differentStations
    }
    
    private fun onAddButtonClicked() {
        val originPosition = originSpinner.selectedItemPosition
        val destinationPosition = destinationSpinner.selectedItemPosition
        
        if (originPosition <= 0 || destinationPosition <= 0) {
            Toast.makeText(this, "Please select both origin and destination stations", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (originPosition == destinationPosition) {
            Toast.makeText(this, "Origin and destination must be different stations", Toast.LENGTH_SHORT).show()
            return
        }
        
        val originId = stationIds[originPosition]
        val destinationId = stationIds[destinationPosition]
        val originName = stationNames[originPosition]
        val destinationName = stationNames[destinationPosition]
        val label = labelEditText.text.toString().trim()
        val refreshIntervalMinutes = refreshIntervalValues[refreshIntervalSpinner.selectedItemPosition]
        
        Log.d("WidgetConfigActivity", "Configuring widget $appWidgetId with:")
        Log.d("WidgetConfigActivity", "  originId: $originId (${originName})")
        Log.d("WidgetConfigActivity", "  destinationId: $destinationId (${destinationName})")
        Log.d("WidgetConfigActivity", "  label: $label")
        Log.d("WidgetConfigActivity", "  refreshInterval: ${refreshIntervalMinutes} minutes")
        
        // Save widget configuration
        val widgetData = WidgetData(
            originId = originId,
            destinationId = destinationId,
            originName = originName,
            destinationName = destinationName,
            label = label,
            updateFrequencyMinutes = refreshIntervalMinutes
        )
        
        WidgetPreferences.saveWidgetData(this, appWidgetId, widgetData)
        Log.d("WidgetConfigActivity", "Widget data saved to preferences")
        
        // Configure the widget with initial data load
        val widgetProvider = TrainScheduleWidgetProvider()
        widgetProvider.configureWidget(this, appWidgetId)
        
        Log.d("WidgetConfigActivity", "Widget configured and initial load triggered")
        
        // Return success
        val resultValue = Intent()
        resultValue.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        setResult(Activity.RESULT_OK, resultValue)
        finish()
    }
}