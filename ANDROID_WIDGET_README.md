# Better Rail Android Widget

This document describes the Android home screen widget implementation for Better Rail.

## Overview

The Android widget displays upcoming train schedules for user-selected routes directly on the home screen. It matches the functionality of the existing iOS widget while using native Android components for optimal performance and battery life.

## Architecture

### Core Components

1. **TrainScheduleWidgetProvider.kt** - Main widget provider handling lifecycle and updates
2. **WidgetConfigActivity.kt** - Configuration activity for selecting routes
3. **TrainScheduleService.kt** - Background service for fetching train data
4. **RailApiService.kt** - API client for Israel Railways data
5. **StationsData.kt** - Station information and lookup utilities

### Data Models

- **WidgetData** - Stores widget configuration (origin, destination, label)
- **TrainModels** - API response models matching the existing TypeScript interfaces
- **WidgetScheduleData** - Processed data for widget display

### Layout Files

- **widget_train_schedule.xml** - Main widget layout
- **activity_widget_config.xml** - Configuration activity layout
- Various drawable resources for theming

## Features

### Widget Functionality
- Real-time train schedules
- Multiple widget sizes (2x1, 4x2)
- Dark/light theme support
- Tap to refresh
- Tap to open main app
- Delay indicators
- Platform information

### Configuration
- Station selection with search/dropdown
- Custom widget labels
- Route validation (different origin/destination)
- Persistent configuration storage

### Data Fetching
- Background service for API calls
- 30-minute refresh intervals
- Error handling and retry logic
- Network timeout handling
- API response caching

## Installation and Setup

### Prerequisites
- Android SDK 21+ (matches app minimum)
- Kotlin support
- OkHttp and Gson dependencies
- Coroutines for async operations

### Build Configuration

Add to `android/app/build.gradle`:
```gradle
dependencies {
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'androidx.appcompat:appcompat:1.6.1'
}
```

### Manifest Registration

The following components are registered in `AndroidManifest.xml`:

```xml
<!-- Widget Configuration Activity -->
<activity
    android:name=".widget.WidgetConfigActivity"
    android:label="@string/widget_configure_title"
    android:theme="@android:style/Theme.Material.Dialog"
    android:exported="false">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_CONFIGURE" />
    </intent-filter>
</activity>

<!-- Widget Provider -->
<receiver
    android:name=".widget.TrainScheduleWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
        <action android:name="com.betterrail.widget.ACTION_REFRESH" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/train_schedule_widget_info" />
</receiver>

<!-- Widget Background Service -->
<service
    android:name=".widget.service.TrainScheduleService"
    android:exported="false" />
```

## Usage

### Adding a Widget

1. Long-press on Android home screen
2. Select "Widgets" from the menu
3. Find "Better Rail" widgets
4. Drag "Schedule" widget to desired location
5. Configuration dialog opens automatically
6. Select origin and destination stations
7. Optionally add a custom label
8. Tap "Add Widget" to confirm

### Widget Behavior

- **Initial Load**: Shows loading indicator while fetching data
- **Success**: Displays next 3 departures with times and platforms
- **Error**: Shows error state with retry option
- **Empty**: Shows "No trains found" message
- **Refresh**: Tap refresh icon or wait for automatic updates

### Widget States

1. **Unconfigured**: "Tap to configure" message
2. **Loading**: Progress indicator with "Loading..." text
3. **Content**: Train schedules with departure times
4. **Error**: Error icon with retry message
5. **Empty**: No trains available message

## API Integration

### Endpoint Usage
- Base URL: `https://rail-api.rail.co.il/rjpa/api/v1/timetable/`
- API Key: Uses existing subscription key
- Same parameters as React Native app
- Hebrew language for consistency

### Data Processing
- Parses ISO date strings to display format (HH:mm)
- Extracts delay information from train position data
- Handles exchange routes (multiple trains)
- Filters to next 5 upcoming departures

### Error Handling
- Network timeouts (30 seconds)
- API error responses
- Malformed data handling
- Graceful degradation

## Theming

### Colors
- Light theme: Matches app's light color scheme
- Dark theme: Automatic system theme support
- Consistent with iOS widget appearance
- High contrast for accessibility

### Layout
- Responsive design for different widget sizes
- RTL support for Hebrew/Arabic
- Material Design guidelines
- Touch targets at least 48dp

## Testing

### Manual Testing Scenarios

1. **Widget Addition**
   - Add widget to home screen
   - Verify configuration dialog appears
   - Test station selection and validation
   - Confirm widget appears after configuration

2. **Data Loading**
   - Verify loading state appears initially
   - Test successful data fetch and display
   - Test error handling with network issues
   - Verify refresh functionality

3. **Configuration**
   - Test all station combinations
   - Verify custom labels work
   - Test configuration persistence
   - Test multiple widgets with different configs

4. **Theming**
   - Test light/dark theme switching
   - Verify colors and readability
   - Test on different Android versions
   - Check widget preview in picker

### Debugging

Enable debugging logs to monitor:
- API request/response cycles
- Widget update triggers
- Configuration data persistence
- Service lifecycle events

Use `adb logcat` with filter: `TrainScheduleWidget*`

## Integration with Existing App

### Shared Resources
- Station data from TypeScript converted to Kotlin
- Same API endpoints and authentication
- Consistent color themes and styling
- Same route validation logic

### Data Sync
- Widget configurations stored in SharedPreferences
- No dependency on React Native bridge
- Independent background updates
- No impact on main app performance

### User Experience
- Widget tap opens main app
- Consistent visual language
- Same station names and ordering
- Familiar interaction patterns

## Performance Considerations

### Battery Optimization
- Background service runs only when needed
- 30-minute update intervals (configurable)
- Efficient API calls with proper timeouts
- Widget updates only when data changes

### Memory Usage
- Lightweight Kotlin implementation
- Minimal dependencies
- Efficient JSON parsing
- Proper service cleanup

### Network Usage
- Compressed API responses
- Smart retry logic
- Connection pooling with OkHttp
- Respect Android network policies

## Future Enhancements

### Possible Improvements
1. Multiple route widgets per user
2. Live activity-style updates
3. Location-based station suggestions
4. Widget size variants (1x1, 4x1)
5. Notification integration for delays

### Technical Debt
1. Add unit tests for core logic
2. Implement proper dependency injection
3. Add integration tests for API client
4. Optimize for Android 14+ features
5. Add analytics for widget usage

## Troubleshooting

### Common Issues

1. **Widget not updating**
   - Check network connectivity
   - Verify API key configuration
   - Check Android battery optimization settings

2. **Configuration not saving**
   - Check SharedPreferences permissions
   - Verify widget ID handling
   - Check manifest registration

3. **Layout issues**
   - Test on different screen densities
   - Verify RTL layout handling
   - Check widget size constraints

4. **API errors**
   - Verify endpoint URLs match main app
   - Check API key validity
   - Monitor network request logs

### Debug Steps
1. Enable developer options and USB debugging
2. Connect device and run `adb logcat`
3. Filter logs for widget-related tags
4. Reproduce issue and capture logs
5. Check widget configuration in device settings

This implementation provides a native Android widget experience that matches the iOS widget functionality while following Android best practices and design guidelines.