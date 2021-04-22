/* eslint-disable camelcase */
import { GeneralApiProblem } from "./api-problem"
import { Character } from "../../models/character/character"

export interface User {
  id: number
  name: string
}

export type GetUsersResult = { kind: "ok"; users: User[] } | GeneralApiProblem
export type GetUserResult = { kind: "ok"; user: User } | GeneralApiProblem

export type GetCharactersResult = { kind: "ok"; characters: Character[] } | GeneralApiProblem
export type GetCharacterResult = { kind: "ok"; character: Character } | GeneralApiProblem

type RailApiRouteItem = {
  Trainno: string
  OrignStation: string
  DestinationStation: string
  ArrivalTime: string
  DepartureTime: string
  StopStations: { StationId: string; ArrivalTime: string; DepartureTime: string; Platform: string }[]
  LineNumber: string
  Route: string
  Midnight: boolean
  Handicap: boolean
  DirectTrain: boolean
  TrainParvariBenironi: any
  ReservedSeat: boolean
  Platform: string
  DestPlatform: string
  IsFullTrain: boolean
}

export type RailApiGetRoutesResult = {
  MessageType: number
  Message: string | null
  Data: {
    Routes: { IsExchange: boolean; EstTime: string; Train: RailApiRouteItem[] }[]
    Details: { Origin: string; Destination: string; Date: string; SugKav: string; Hour: string }
  }
}

export type RouteItem = {
  isExchange: boolean
  estTime: string
  departureTime: number
  trains: {
    originStationId: string
    originStationName: string
    destinationStationId: string
    destinationStationName: string
    arrivalTime: number
    departureTime: number
    originPlatform: string
    destinationPlatform: string
    trainNumber: string
    stopStations: { arrivalTime: number; departureTime: number; stationId: string; stationName: string; platform: string }[]
  }[]
}

export type RequestBarodeParams = {
  userId: string
  phoneNumber: string
  token: string
  route: RouteItem
}

export interface Voucher {
  VoucherID: number
  ReservationNumber: string
  TrainNumber: number
  FromStationCode: string
  DestStationCode: string
  FromStationName: string
  DestStationName: string
  FromStationName_HE: string
  DestStationName_HE: string
  TrainDate: string
  UserPhone: string
  SmartCard: string
  PlacesCount: number
  UserEmail: string
  Created: string
  GeneretedReferenceValue: string
  ErrorCode: string
  ErrorDescription: string
  ReservationStatus: boolean
  SendEmail: boolean
  SendSms: boolean
  ChangeStationCode: string
  ChangeStationName: string
  ChangeStationName_He: string
  ChangeTrainNumber: number
  ChangeTrainDate: string
  QRNumerator: any
}

export interface RequestVoutcherResult {
  voutcher: Voucher
  seats: number | null
  trainsResult: null
  BarcodeImage: string | null
  IsValidCaptcha: boolean
  BarcodeString: string | null
}
