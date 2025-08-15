package com.betterrail.widget.di

import android.content.Context
import com.betterrail.widget.api.RailApiService
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import com.betterrail.widget.repository.ModernCacheRepository
import com.betterrail.widget.repository.TrainScheduleRepository
import com.betterrail.widget.database.WidgetDatabase
import com.betterrail.widget.database.dao.TrainScheduleDao
import com.betterrail.widget.config.NetworkConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for widget-related dependencies
 */
@Module
@InstallIn(SingletonComponent::class)
object WidgetModule {

    @Provides
    @Singleton
    fun provideNetworkConfig(
        @ApplicationContext context: Context
    ): NetworkConfig {
        return NetworkConfig(context)
    }

    @Provides
    @Singleton
    fun provideRailApiService(
        networkConfig: NetworkConfig
    ): RailApiService {
        return RailApiService(networkConfig)
    }


    @Provides
    @Singleton
    fun provideModernWidgetPreferencesRepository(
        @ApplicationContext context: Context
    ): ModernWidgetPreferencesRepository {
        return ModernWidgetPreferencesRepository(context)
    }

    @Provides
    @Singleton
    fun provideWidgetDatabase(
        @ApplicationContext context: Context
    ): WidgetDatabase {
        return WidgetDatabase.getDatabase(context)
    }

    @Provides
    fun provideTrainScheduleDao(database: WidgetDatabase): TrainScheduleDao {
        return database.trainScheduleDao()
    }

    @Provides
    @Singleton
    fun provideModernCacheRepository(
        @ApplicationContext context: Context,
        database: WidgetDatabase
    ): ModernCacheRepository {
        return ModernCacheRepository(context, database)
    }

    @Provides
    @Singleton
    fun provideTrainScheduleRepository(
        @ApplicationContext context: Context,
        apiService: RailApiService,
        cacheRepository: ModernCacheRepository
    ): TrainScheduleRepository {
        return TrainScheduleRepository(context, apiService, cacheRepository)
    }

}