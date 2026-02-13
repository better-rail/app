package com.betterrail.widget

import androidx.appcompat.app.AppCompatActivity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.*
import android.text.TextWatcher
import android.text.Editable
import android.view.KeyEvent
import android.view.inputmethod.EditorInfo
import com.betterrail.R
import android.util.Log
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import com.betterrail.widget.repository.ModernCacheRepository
import kotlinx.coroutines.*
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
abstract class BaseWidgetConfigActivity : AppCompatActivity() {
    companion object {
        private const val FIRST_ITEM_INDEX = 0
    }

    @Inject
    lateinit var preferencesRepository: ModernWidgetPreferencesRepository
    
    @Inject
    lateinit var cacheRepository: ModernCacheRepository

    protected lateinit var originSearch: AutoCompleteTextView
    protected lateinit var destinationSearch: AutoCompleteTextView
    protected lateinit var routeReversalCheckbox: CheckBox
    protected lateinit var autoReverseRouteCheckbox: CheckBox
    protected lateinit var maxChangesSpinner: Spinner
    protected lateinit var addButton: Button
    protected lateinit var cancelButton: Button
    protected lateinit var advancedHeader: android.view.View
    protected lateinit var advancedChevron: TextView
    protected lateinit var advancedOptionsContainer: android.view.View
    
    protected var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    protected lateinit var stationAdapter: ArrayAdapter<String>
    protected val stationIds = mutableListOf<String>()
    protected val stationNames = mutableListOf<String>()
    
    private var selectedOriginId: String = ""
    private var selectedDestinationId: String = ""
    private var isReconfiguring: Boolean = false

    abstract fun getLogTag(): String
    abstract fun createWidgetProvider(): ModernBaseWidgetProvider

    /**
     * Convert maxChanges value to spinner position
     */
    private fun maxChangesToSpinnerPosition(maxChanges: Int?): Int {
        return when (maxChanges) {
            null -> 0  // No limit
            0 -> 1     // Direct only
            1 -> 2     // 1 change
            else -> 0  // Default to no limit (handles 2, 3, or any other value)
        }
    }

    /**
     * Convert spinner position to maxChanges value
     */
    private fun spinnerPositionToMaxChanges(position: Int): Int? {
        return when (position) {
            0 -> null   // No limit
            1 -> 0      // Direct only
            2 -> 1      // 1 change max
            else -> null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set the result to CANCELED in case the user backs out
        setResult(RESULT_CANCELED)
        
        setContentView(R.layout.activity_widget_config)

        // Set status bar icons color based on theme
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val view = window.decorView
            var flags = view.systemUiVisibility
            
            val nightModeFlags = resources.configuration.uiMode and android.content.res.Configuration.UI_MODE_NIGHT_MASK
            if (nightModeFlags == android.content.res.Configuration.UI_MODE_NIGHT_YES) {
                // In dark mode, clear the flag to get light icons (standard behavior)
                flags = flags and android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
            } else {
                // In light mode, set the flag to get dark icons
                flags = flags or android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
            }
            view.systemUiVisibility = flags
        }
        
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
        
        // Check if widget already exists (reconfiguration)
        lifecycleScope.launch {
            checkIfReconfiguring()
        }
    }
    
    
    private fun setupUI() {
        originSearch = findViewById(R.id.origin_search)
        destinationSearch = findViewById(R.id.destination_search)
        routeReversalCheckbox = findViewById(R.id.route_reversal_checkbox)
        autoReverseRouteCheckbox = findViewById(R.id.auto_reverse_route_checkbox)
        maxChangesSpinner = findViewById(R.id.max_changes_spinner)
        addButton = findViewById(R.id.add_button)
        cancelButton = findViewById(R.id.cancel_button)
        advancedHeader = findViewById(R.id.advanced_header)
        advancedChevron = findViewById(R.id.advanced_chevron)
        advancedOptionsContainer = findViewById(R.id.advanced_options_container)

        routeReversalCheckbox.isChecked = true
        autoReverseRouteCheckbox.isChecked = false

        // Setup max changes spinner
        val changesOptions = resources.getStringArray(R.array.max_changes_options)
        val changesAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_item,
            changesOptions
        )
        changesAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        maxChangesSpinner.adapter = changesAdapter
        maxChangesSpinner.setSelection(0)  // Default: No limit

        // Setup advanced section expand/collapse
        setupAdvancedSection()

        addButton.setOnClickListener { onAddButtonClicked() }
        cancelButton.setOnClickListener { finish() }
    }

    private fun setupAdvancedSection() {
        advancedHeader.setOnClickListener {
            toggleAdvancedSection()
        }
    }

    private fun toggleAdvancedSection() {
        val isExpanded = advancedOptionsContainer.visibility == android.view.View.VISIBLE

        if (isExpanded) {
            // Collapse
            advancedOptionsContainer.visibility = android.view.View.GONE
            advancedChevron.rotation = 0f
        } else {
            // Expand
            advancedOptionsContainer.visibility = android.view.View.VISIBLE
            advancedChevron.rotation = 90f
        }
    }
    
    private fun setupStationData() {       
        // Get stations for display (will use system locale for proper language)
        val stationsForDisplay = StationsData.getStationsForDisplay(this)
        
        // Clear lists
        stationIds.clear()
        stationNames.clear()
        
        // Add all stations (no "Select Station" needed for AutoCompleteTextView)
        stationsForDisplay.forEach { (id, name) ->
            stationIds.add(id)
            stationNames.add(name)
        }
        
        // Create adapter for AutoCompleteTextView
        stationAdapter = ArrayAdapter(
            this,
            android.R.layout.simple_dropdown_item_1line,
            stationNames
        )
        
        // Set adapters
        originSearch.setAdapter(stationAdapter)
        destinationSearch.setAdapter(stationAdapter)
        
        // Configure AutoCompleteTextView to show all items when empty
        originSearch.threshold = 0
        destinationSearch.threshold = 0
        
        // Set listeners for selection and text changes
        setupSearchListeners()
        
        // Setup IME action listeners for Enter key handling
        setupImeActionListeners()
    }
    
    private fun setupSearchListeners() {
        // Origin search listeners
        originSearch.setOnItemClickListener { _, _, position, _ ->
            val selectedName = stationAdapter.getItem(position)
            val selectedIndex = stationNames.indexOf(selectedName)
            if (selectedIndex >= 0) {
                selectedOriginId = stationIds[selectedIndex]
                Log.d(getLogTag(), "Origin selected: $selectedName (ID: $selectedOriginId)")
                updateAddButtonState()
            }
        }
        
        // Show dropdown when text field is focused or clicked
        originSearch.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                showDropdownSafely(originSearch)
            }
        }
        
        originSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val text = s.toString()
                val exactMatch = stationNames.indexOf(text)
                if (exactMatch >= 0) {
                    selectedOriginId = stationIds[exactMatch]
                } else {
                    selectedOriginId = ""
                }
                
                // Show dropdown when text becomes empty
                if (text.isEmpty() && originSearch.hasFocus()) {
                    showDropdownWhenEmpty(originSearch)
                }
                
                updateAddButtonState()
            }
        })
        
        // Destination search listeners  
        destinationSearch.setOnItemClickListener { _, _, position, _ ->
            val selectedName = stationAdapter.getItem(position)
            val selectedIndex = stationNames.indexOf(selectedName)
            if (selectedIndex >= 0) {
                selectedDestinationId = stationIds[selectedIndex]
                Log.d(getLogTag(), "Destination selected: $selectedName (ID: $selectedDestinationId)")
                updateAddButtonState()
            }
        }
        
        // Show dropdown when text field is focused or clicked
        destinationSearch.setOnFocusChangeListener { _, hasFocus ->
            if (hasFocus) {
                showDropdownSafely(destinationSearch)
            }
        }
        
        destinationSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val text = s.toString()
                val exactMatch = stationNames.indexOf(text)
                if (exactMatch >= 0) {
                    selectedDestinationId = stationIds[exactMatch]
                } else {
                    selectedDestinationId = ""
                }
                
                // Show dropdown when text becomes empty
                if (text.isEmpty() && destinationSearch.hasFocus()) {
                    showDropdownWhenEmpty(destinationSearch)
                }
                
                updateAddButtonState()
            }
        })
    }
    
    private fun setupImeActionListeners() {
        // Handle Enter key in origin search - move to destination
        originSearch.setOnEditorActionListener { _, actionId, event ->
            when (actionId) {
                EditorInfo.IME_ACTION_NEXT -> {
                    destinationSearch.requestFocus()
                    true
                }
                else -> {
                    // Handle hardware Enter key
                    if (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN) {
                        destinationSearch.requestFocus()
                        true
                    } else {
                        false
                    }
                }
            }
        }
        
        // Handle Enter key in destination search - trigger add button if enabled
        destinationSearch.setOnEditorActionListener { _, actionId, event ->
            when (actionId) {
                EditorInfo.IME_ACTION_DONE -> {
                    if (addButton.isEnabled) {
                        onAddButtonClicked()
                    }
                    true
                }
                else -> {
                    // Handle hardware Enter key
                    if (event?.keyCode == KeyEvent.KEYCODE_ENTER && event.action == KeyEvent.ACTION_DOWN) {
                        if (addButton.isEnabled) {
                            onAddButtonClicked()
                        }
                        true
                    } else {
                        false
                    }
                }
            }
        }
    }
    
    private fun showDropdownSafely(autoCompleteTextView: AutoCompleteTextView, delayMs: Long = 0) {
        autoCompleteTextView.postDelayed({
            if (autoCompleteTextView.isAttachedToWindow) {
                autoCompleteTextView.showDropDown()
            }
        }, delayMs)
    }

    private fun showDropdownWhenEmpty(autoCompleteTextView: AutoCompleteTextView) {
        showDropdownSafely(autoCompleteTextView, 50)
    }
    
    private fun updateAddButtonState() {
        val originSelected = selectedOriginId.isNotEmpty()
        val destinationSelected = selectedDestinationId.isNotEmpty()
        val differentStations = selectedOriginId != selectedDestinationId
        
        addButton.isEnabled = originSelected && destinationSelected && differentStations
    }
    
    /**
     * Check if this is a reconfiguration of an existing widget
     */
    private suspend fun checkIfReconfiguring() {
        try {
            // Check if widget data already exists
            val existingData = withContext(Dispatchers.IO) {
                preferencesRepository.getWidgetData(appWidgetId)
            }
            
            isReconfiguring = existingData != null
            
            // Update button text based on mode
            if (isReconfiguring) {
                addButton.text = getString(R.string.widget_edit)
                // Load existing data
                loadExistingWidgetData(existingData!!)
            } else {
                addButton.text = getString(R.string.widget_add)
            }
            
            Log.d(getLogTag(), "Widget reconfiguration mode: $isReconfiguring")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error checking widget reconfiguration status", e)
            // Default to new widget mode
            addButton.text = getString(R.string.widget_add)
        }
    }
    
    /**
     * Load existing widget data for reconfiguration
     */
    private fun loadExistingWidgetData(data: WidgetData) {
        selectedOriginId = data.originId
        selectedDestinationId = data.destinationId

        // Find and set station names in search fields
        val originIndex = stationIds.indexOf(selectedOriginId)
        val destinationIndex = stationIds.indexOf(selectedDestinationId)

        if (originIndex >= 0) {
            originSearch.setText(stationNames[originIndex])
        }
        if (destinationIndex >= 0) {
            destinationSearch.setText(stationNames[destinationIndex])
        }

        // Set route reversal checkbox
        routeReversalCheckbox.isChecked = data.allowRouteReversal
        
        // Set auto-reverse route checkbox
        autoReverseRouteCheckbox.isChecked = data.autoReverseRoute

        // Set max changes spinner
        maxChangesSpinner.setSelection(maxChangesToSpinnerPosition(data.maxChanges))

        // Auto-expand advanced section if any advanced options are non-default
        if (data.allowRouteReversal || data.autoReverseRoute || data.maxChanges != null) {
            advancedOptionsContainer.visibility = android.view.View.VISIBLE
            advancedChevron.rotation = 90f
        }

        updateAddButtonState()
        Log.d(getLogTag(), "Loaded existing widget data: ${stationNames.getOrNull(originIndex)} -> ${stationNames.getOrNull(destinationIndex)}")
    }
    
    private fun onAddButtonClicked() {
        try {
            Log.d(getLogTag(), "Add button clicked for widget $appWidgetId")
            
            if (selectedOriginId.isEmpty() || selectedDestinationId.isEmpty()) {
                Toast.makeText(this, "Please select both origin and destination stations", Toast.LENGTH_SHORT).show()
                return
            }
            
            if (selectedOriginId == selectedDestinationId) {
                Toast.makeText(this, "Origin and destination must be different", Toast.LENGTH_SHORT).show()
                return
            }
            
            val originId = selectedOriginId
            val destinationId = selectedDestinationId
            val originName = originSearch.text.toString()
            val destinationName = destinationSearch.text.toString()
            
            Log.d(getLogTag(), "Saving widget data: $originName -> $destinationName")
            
            // Use coroutine for async operations
            CoroutineScope(Dispatchers.Main).launch {
                try {
                    // Convert spinner selection to maxChanges value
                    val maxChanges = spinnerPositionToMaxChanges(maxChangesSpinner.selectedItemPosition)

                    // Check if this is a route or filter change for existing widget
                    val existingWidgetData = preferencesRepository.getWidgetData(appWidgetId)
                    val isRouteChange = existingWidgetData != null &&
                                       (existingWidgetData.originId != originId || existingWidgetData.destinationId != destinationId)
                    val isFilterChange = existingWidgetData != null && 
                                       (existingWidgetData.maxChanges != maxChanges || 
                                        existingWidgetData.autoReverseRoute != autoReverseRouteCheckbox.isChecked)

                    if (isRouteChange || isFilterChange) {
                        Log.d(getLogTag(), "Route or filter change detected, clearing old cache for widget $appWidgetId")
                        cacheRepository.clearWidgetCache(appWidgetId)
                    }

                    val widgetData = WidgetData(
                        originId = originId,
                        destinationId = destinationId,
                        originName = "", // Don't store localized names - look them up dynamically
                        destinationName = "", // Don't store localized names - look them up dynamically
                        label = "",
                        allowRouteReversal = routeReversalCheckbox.isChecked,
                        autoReverseRoute = autoReverseRouteCheckbox.isChecked,
                        manualOverrideUntil = 0, // Reset override on configuration change
                        maxChanges = maxChanges
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
