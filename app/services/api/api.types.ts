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
  }
}

export type RouteItem = {
  isExchange: boolean
  estTime: string
  trains: {
    stationId: string
    stationName: string
    arrivalTime: string
    departureTime: string
    stopStations: { arrivalTime: string; departureTime: string; stationId: string; stationName: string; platform: string }[]
  }[]
}
