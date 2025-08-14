package com.betterrail.widget.database.dao

import androidx.room.*
import com.betterrail.widget.database.entities.TrainScheduleEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for train schedule caching
 */
@Dao
interface TrainScheduleDao {

    @Query("SELECT * FROM train_schedules WHERE cacheKey = :cacheKey")
    suspend fun getSchedule(cacheKey: String): TrainScheduleEntity?

    @Query("SELECT * FROM train_schedules WHERE cacheKey = :cacheKey")
    fun getScheduleFlow(cacheKey: String): Flow<TrainScheduleEntity?>

    @Query("SELECT * FROM train_schedules WHERE widgetId = :widgetId ORDER BY cacheTimestamp DESC LIMIT 1")
    suspend fun getLatestScheduleForWidget(widgetId: Int): TrainScheduleEntity?

    @Query("SELECT * FROM train_schedules WHERE originId = :originId AND destinationId = :destinationId ORDER BY cacheTimestamp DESC LIMIT 1")
    suspend fun getLatestScheduleForRoute(originId: String, destinationId: String): TrainScheduleEntity?

    @Query("SELECT * FROM train_schedules WHERE widgetId = :widgetId")
    suspend fun getAllSchedulesForWidget(widgetId: Int): List<TrainScheduleEntity>

    @Query("SELECT * FROM train_schedules WHERE cacheTimestamp > :timestamp")
    suspend fun getSchedulesNewerThan(timestamp: Long): List<TrainScheduleEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedule(schedule: TrainScheduleEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSchedules(schedules: List<TrainScheduleEntity>)

    @Update
    suspend fun updateSchedule(schedule: TrainScheduleEntity)

    @Delete
    suspend fun deleteSchedule(schedule: TrainScheduleEntity)

    @Query("DELETE FROM train_schedules WHERE widgetId = :widgetId")
    suspend fun deleteSchedulesForWidget(widgetId: Int)

    @Query("DELETE FROM train_schedules WHERE cacheKey = :cacheKey")
    suspend fun deleteSchedule(cacheKey: String)

    @Query("DELETE FROM train_schedules WHERE cacheTimestamp < :timestamp")
    suspend fun deleteOldSchedules(timestamp: Long)

    @Query("DELETE FROM train_schedules")
    suspend fun deleteAllSchedules()

    @Query("SELECT COUNT(*) FROM train_schedules")
    suspend fun getScheduleCount(): Int

    @Query("SELECT COUNT(*) FROM train_schedules WHERE widgetId = :widgetId")
    suspend fun getScheduleCountForWidget(widgetId: Int): Int

    // Cache maintenance queries
    @Query("SELECT DISTINCT widgetId FROM train_schedules")
    suspend fun getAllCachedWidgetIds(): List<Int>

    @Query("SELECT * FROM train_schedules ORDER BY cacheTimestamp ASC LIMIT :limit")
    suspend fun getOldestSchedules(limit: Int): List<TrainScheduleEntity>

    @Query("SELECT cacheKey FROM train_schedules WHERE cacheTimestamp < :timestamp")
    suspend fun getExpiredCacheKeys(timestamp: Long): List<String>
}