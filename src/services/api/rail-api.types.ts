type RailApiRouteItem = {
  departureTime: string
  arrivalTime: string
  freeSeats: number
  travelMessages: any[]
  trains: ApiTrain[]
}

export interface ApiTrain {
  trainNumber: number
  orignStation: number
  destinationStation: number
  originPlatform: number
  destPlatform: number
  freeSeats: number
  arrivalTime: string
  departureTime: string
  stopStations: StopStation[]
  handicap: number
  crowded: number
  trainPosition: TrainPosition
  routeStations: RouteStation[]
  visaWagonData: VisaWagonData | null
  // Realtime (SIRI) fields from the Better Rail server; absent when there's no live data.
  isCancelled?: boolean
  /** The train now terminates at a different station than scheduled. */
  actualLastStationId?: number
  /** Live platform differs from the scheduled one at the boarding/alighting station. */
  originPlatformChanged?: boolean
  destPlatformChanged?: boolean
}

export interface TrainPosition {
  calcDiffMinutes: number
}

export interface StopStation {
  stationId: number
  arrivalTime: string
  departureTime: string
  platform: number
  crowded: number
  /** Realtime: live platform differs from the scheduled one. */
  platformChanged?: boolean
  /** Realtime: the train will skip this stop. */
  cancelled?: boolean
}

export interface RouteStation {
  stationId: number
  arrivalTime: string
  crowded: number
  platform: number
  /** Realtime: live platform differs from the scheduled one. */
  platformChanged?: boolean
  /** Realtime: the train will skip this stop. */
  cancelled?: boolean
}

export type RailApiGetRoutesResult = {
  result: {
    travels: RailApiRouteItem[]
  }
}

export type Train = {
  originStationId: number
  originStationName: string
  destinationStationId: number
  destinationStationName: string
  arrivalTime: number
  arrivalTimeString: string
  departureTime: number
  departureTimeString: string
  originPlatform: number
  destinationPlatform: number
  trainNumber: number
  stopStations: {
    arrivalTime: number
    arrivalTimeString: string
    departureTime: number
    departureTimeString: string
    stationId: number
    stationName: string
    platform: number
    platformChanged?: boolean
    cancelled?: boolean
  }[]
  lastStop: string
  /** The train's last stop differs from the scheduled one (lastStop holds the live one). */
  isLastStopChanged: boolean
  /** The whole train is cancelled. */
  isCancelled: boolean
  /** The train skips the boarding / alighting station of this leg. */
  originCancelled: boolean
  destinationCancelled: boolean
  /** Live platform differs from the scheduled one. */
  originPlatformChanged: boolean
  destinationPlatformChanged: boolean
  delay: number
  trainPosition: TrainPosition
  routeStations: RouteStation[]
  visaWagonData: VisaWagonData | null
}

export type RouteItem = {
  delay: number
  isExchange: boolean
  duration: string
  departureTime: number
  departureTimeString: String
  arrivalTime: number
  arrivalTimeString: string
  isMuchLonger: boolean
  isMuchShorter: boolean
  /** A leg is cancelled or skips this journey's boarding/alighting station. */
  isCancelled: boolean
  trains: Train[]
}

export interface Title {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface ContractTitleCount {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface Title2 {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface SubTitle {
  HE: string
  EN: string
  RU: string
  AR: string
}

export interface ContractsResult {
  Trip_Type: string
  ETT_Code: number
  PREDEFINE: number
  Metro_Code: number
  Station_Code_Origin: number
  Station_Code_Dest: number
  SmartCard_Profile_Code: number
  ContractCodeMagnetic: number
  Magnetic_Profile_Code: number
  Contract_Code: number
  Contract_Name_He: string
  Contract_Name_En: string
  Contract_Name_Ar: string
  Contract_Name_Ru: string
  Price: string
  IsAvailableForSale: boolean
  RestrictionTitle_HE: string
  RestrictionTitle_EN: string
  RestrictionTitle_RU: string
  RestrictionTitle_AR: string
}

export interface OmesDetail {
  StationNumber: number
  OmesPercent: number
  Shmurim: string
  Time: string
  Platform: number
}

export interface AnnouncementApiResult {
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: Announcement[]
}

export interface PopUpMessagesApiResult {
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: PopUpMessage[]
}

export interface Announcement {
  updateHeader: string
  updateContent: string
  updateLink: string
  stations: string[]
  linkText: string
  updateType: string
}

export interface PopUpMessage {
  id: number
  pageTypeId: number
  title: string
  messageBody: string
  startDate: string
  endDate: string
  systemTypeId: number
}

export interface StationInfoApiResult {
  creationDate: string
  version: string
  successStatus: number
  statusCode: number
  errorMessages: any
  result: StationInfo
}

export interface StationInfo {
  creationDate: string
  version: any
  successStatus: number
  statusCode: number
  errorMessages: any
  stationUpdates: StationUpdate[]
  stationDetails: StationDetails
  gateInfo: GateInfo[]
  easyCategories: string[]
  safetyInfos: string[]
}

export interface StationUpdate {
  updateHeader: string
  updateContent: string
  updateLink: string
  stations: string[]
  linkText: string
  updateType: string
}

export interface StationDetails {
  stationId: number
  stationName: string
  carParking: string
  parkingCosts: string
  bikeParking: string
  bikeParkingCosts: string
  airPollutionIcon: any
  stationMap: any
  nonActiveElevators: any
  nonActiveElevatorsLink: any
  stationIsClosed: boolean
  stationIsClosedUntill: string
  stationIsClosedText: any
  stationInfoTitle: string
  stationInfo: string
  aboutStationTitle: string
  aboutStationContent: string
  parkingTitleTranslationKey: string
  parkingContentTranslationKey: string
}

export interface GateInfo {
  stationGateId: number
  gateName: string
  gateAddress?: string
  gateLatitude: number
  gateLontitude: number
  gateActivityHours: GateActivityHour[]
  gateServices: GateService[]
  nonActiveElavators: string
}

export interface GateActivityHour {
  activityHoursType: number
  isClosedShortText: string
  isClosedLongText: string
  activityDaysNumbers: string
  startHourTextKey: any
  startHour: string
  startHourReplaceTextKey: any
  endHourPrefixTextKey: any
  endHour: string
  endHourReplaceTextKey: any
  endHourPostfixTextKey: any
  activityHoursReplaceTextKey?: string
}

export interface GateService {
  serviceName: string
  serviceIcon: string
  serviceIconLink: string
  serviceIconImg: any
}

export interface VisaWagonData {
  totkr: number         // Total Wagons
  kvsgkR_MOVIL: string  // Train type identifier
  kvsgkR_LAST: string   // Last wagon type identifier
  seatplaces: number    // Total number of seats
  updateDate: string
  updateTime: string
  wagons: Wagon[]
}

export interface Wagon {
  krsid: number               // Wagon ID
  shurA2: number              // Wagon position in train
  krsG3: string               // Wagon type
  wagoN_TEUR_DISPLAY: string  // Hebrew-encoded display text for wagon type
  kvsgkr: string              // Wagon model code
  handicapped: boolean        // Wheelchair accessible
  bicycle: boolean            // Bicycle allowed
}
