package com.betterrail.widget

class CompactWidget4x3ConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "CompactWidget4x3Config"
    
    override fun createWidgetProvider(): ModernBaseWidgetProvider {
        return ModernCompactWidget4x3Provider()
    }
}
