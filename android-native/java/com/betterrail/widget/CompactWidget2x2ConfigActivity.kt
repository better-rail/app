package com.betterrail.widget

class CompactWidget2x2ConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "CompactWidgetConfig"
    
    override fun createWidgetProvider(): ModernBaseWidgetProvider {
        return ModernCompactWidget2x2Provider()
    }
}