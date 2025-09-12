package com.betterrail.widget.database

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.betterrail.widget.database.entities.TrainScheduleEntity
import com.betterrail.widget.database.dao.TrainScheduleDao
import com.betterrail.widget.database.converters.TrainItemListConverter

/**
 * Room database for widget caching
 */
@Database(
    entities = [TrainScheduleEntity::class],
    version = 1,
    exportSchema = false
)
@TypeConverters(TrainItemListConverter::class)
abstract class WidgetDatabase : RoomDatabase() {

    abstract fun trainScheduleDao(): TrainScheduleDao

    companion object {
        const val DATABASE_NAME = "widget_database"
        
        @Volatile
        private var INSTANCE: WidgetDatabase? = null

        fun getDatabase(context: Context): WidgetDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    WidgetDatabase::class.java,
                    DATABASE_NAME
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}