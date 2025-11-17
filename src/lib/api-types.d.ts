export interface DomainAnalysis {
    coordinates: [number, number];
    cityOrAirport: string;
    population?: number;
}

export interface ProbeResult {
    index: number
    domain: string
    ip: string
    delay: number
    domainAnalysis?: DomainAnalysis
}

type City = string;

export interface CityMap {
    [key: City]: CSVCities
}

export interface CSVCities {
    city: string,
    city_ascii: string,
    lat: string,
    lng: string,
    country: string,
    iso2: string,
    iso3: string,
    admin_name: string,
    capital: "minor" | "primary" | "",
    population: string,
    id: string
}

export interface AirportCSV {
    code: string,
    icao: string,
    name: string,
    latitude: string,
    longitude: string,
    elevation: string,
    url: string,
    time_zone: string,
    city_code: string,
    country: string,
    city: string,
    state: string,
    country: string,
    type: string
}

type IATA = string;

export interface AirportMap {
    [key: IATA]: AirportCSV
}
