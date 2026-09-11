package com.betterrail.widget

class CompactWidget4x4ConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "CompactWidget4x4Config"
    
    override fun createWidgetProvider(): ModernBaseWidgetProvider {
        return ModernCompactWidget4x4Provider()
    }
}
