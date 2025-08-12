package com.betterrail.widget

class CompactWidget2x2ConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "CompactWidgetConfig"
    
    override fun createWidgetProvider(): BaseWidgetProvider {
        return CompactWidget2x2Provider()
    }
}