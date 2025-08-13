package com.betterrail.widget

class CompactWidget4x2ConfigActivity : BaseWidgetConfigActivity() {
    
    override fun getLogTag(): String = "CompactWidget4x2Config"
    
    override fun createWidgetProvider(): BaseWidgetProvider {
        return CompactWidget4x2Provider()
    }
}