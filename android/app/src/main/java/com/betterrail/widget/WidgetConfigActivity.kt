package com.betterrail.widget

class WidgetConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "WidgetConfigActivity"
    
    override fun createWidgetProvider(): BaseWidgetProvider {
        return TrainScheduleWidgetProvider()
    }
}