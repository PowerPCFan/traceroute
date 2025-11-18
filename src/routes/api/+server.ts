// import { exec } from 'node:child_process';
import { execFile } from 'node:child_process';
// import { readFile } from "node:fs/promises";
import net from "node:net"
import type { AirportCSV, AirportMap, CityMap, CSVCities, ProbeResult } from '$lib/api-types';
import { error } from '@sveltejs/kit';
// import { parse } from "csv-parse/sync";
// import { fileURLToPath } from 'node:url';
// import path from 'node:path';
import airports from "$lib/airports.json";
import worldCities from "$lib/cities/worldcities.json";
import Database from "better-sqlite3";

const isDev = process.env.NODE_ENV === 'development';

const KNOWN_REPLACEMENTS = new Map(Object.entries({
    "hls": "hel",
    "sto": "arn",
    "kbn": "cph",
    "kan": "mci",
    "pal": "pao",
    "chi": "ord"
}));

const TEST_TRACEROUTE = `traceroute to 104.248.99.119 (104.248.99.119), 25 hops max, 60 byte packets
 1  DESKTOP-K8CPH23.mshome.net (172.26.160.1)  1.415 ms
 2  192.168.32.1 (192.168.32.1)  1.360 ms
 3  *
 4  *
 5  10.209.5.37 (10.209.5.37)  59.754 ms
 6  10.209.5.38 (10.209.5.38)  59.896 ms
 7  *
 8  *
 9  hls-b4-link.ip.twelve99.net (62.115.153.140)  59.623 ms
10  sto-bb2-link.ip.twelve99.net (62.115.123.202)  59.621 ms
11  kbn-bb6-link.ip.twelve99.net (62.115.139.173)  60.511 ms
12  ewr-bb2-link.ip.twelve99.net (80.91.254.91)  115.956 ms
13  chi-bb2-link.ip.twelve99.net (62.115.132.135)  176.155 ms
14  kanc-bb2-link.ip.twelve99.net (62.115.136.103)  174.319 ms
15  den-bb2-link.ip.twelve99.net (62.115.140.185)  167.263 ms
16  palo-bb2-link.ip.twelve99.net (62.115.139.112)  176.308 ms
17  palo-b24-link.ip.twelve99.net (62.115.139.111)  162.729 ms
18  singaporetelco-ic-335366.ip.twelve99-cust.net (62.115.8.201)  176.068 ms
19  203.208.172.233 (203.208.172.233)  160.174 ms
20  203.208.172.225 (203.208.172.225)  366.545 ms
21  203.208.151.37 (203.208.151.37)  366.486 ms
22  203.208.151.50 (203.208.151.50)  366.254 ms
23  203.208.149.2 (203.208.149.2)  366.556 ms
24  203.208.186.174 (203.208.186.174)  366.542 ms
25  *`

const database = new Database('ips.db');

// @ts-expect-error TS2740
const rawCityData: CSVCities[] = worldCities;
const cityData: CityMap = Object.fromEntries(rawCityData.map(city => [city.city_ascii.toLowerCase(), {...city}]));

const rawAirportData: AirportCSV[] = airports
const airportData: AirportMap = Object.fromEntries(rawAirportData.map(airport => [airport.code.toLowerCase(), {...airport}]));

async function parseOutput(lines: string[]): Promise<ProbeResult[]> {
    console.log(lines);
    const domainLocationRegex = /[a-z]{3}/g;
    let results: ProbeResult[] = [];

    for(const line of lines) {
        console.log();
        console.log(line);
        const parts = line.match(/\S+/g) || [];
        if(parts.length != 5) {
            console.log(`Skipping line ${parts[0]} insufficent data ${parts.length} ${line}`);
            continue;
        }

        const index = parts[0];
        const domain = parts[1];
        const ip = parts[2].replace("(", "").replace(")", "");
        const delay = parts[3];
        
        let result: ProbeResult = {
            index: Number(index),
            delay: Number(delay),
            domain: domain,
            ip: ip,
            domainAnalysis: undefined
        }
        
        for(let city of rawCityData) {
            if(domain.toLowerCase().includes(city.city.toLocaleLowerCase()) && city.city.length > 5) {
                if(Number(city.population) > (result.domainAnalysis?.population || 0)) {
                    console.log("Matched city " + city.city);
                    result.domainAnalysis = {
                        cityOrAirport: city.city.toLocaleLowerCase(),
                        coordinates: [Number(city.lat), Number(city.lng)],
                        population: Number(city.population)
                    }
                }
            }
        } 

        if(!result.domainAnalysis)  {
            const matches = domain.match(domainLocationRegex);
            if(matches) {
                for(let match of matches) {
                    const replacement = KNOWN_REPLACEMENTS.get(match.toLocaleLowerCase().trim())
                    console.log(match);
                    if(replacement) {
                        match = replacement;
                    }

                    console.log("Checking match " + match);

                    const data = airportData[match.toLocaleLowerCase()];
                    if(!data || !data.url || !data.icao || Number(cityData[data.city.toLocaleLowerCase().trim()]?.population ?? 0) < 25000) {
                        console.log("Skipping airport because URL isnt there");
                    } else {
                        console.log("Which was succesfull");
                        console.log(cityData[match.toLowerCase().trim()]);
                        result.domainAnalysis = {
                            cityOrAirport: match.toUpperCase(),
                            coordinates: [Number(data.latitude), Number(data.longitude)]
                        }
                        break;
                    }
                }
            }
        }

       if(!result.domainAnalysis) {
            const geolocation = await getLocationFromIp(ip);
            if(geolocation[0]) {
                result.domainAnalysis = {
                    cityOrAirport: "unknown",
                    coordinates: geolocation,
                    population: 0
                }
            }
       }
        results.push(result);
    }

    console.log(results);
    return results.slice(1);
} 

async function getLocationFromIp(ip: string): Promise<[number, number]> {
    database.exec(`
        CREATE TABLE IF NOT EXISTS ips (
            ip  TEXT primary key,
            lat REAL NOT     NULL,
            lng REAL NOT     NULL
        )
    `)

    // @ts-expect-error TS2322
    const result: {lat: number, lng: number} | undefined = database.prepare("SELECT * FROM ips WHERE ip=?").get(ip);

    if(result) {
        console.log(`Found ip ${ip} in database`);
        return [result.lat, result.lng]
    } else {
        console.log(`Getting geolocation for ip ${ip}`);
        const result = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,lat,lon`);
        const json = await result.json();

        const [lat, lng] = [Number(json["lat"]), Number(json["lon"])];
        if(lat && lng) {
            database.prepare("INSERT INTO ips (ip, lat, lng) VALUES (?, ?, ?)").run(ip, lat, lng);
        }

        return [lat, lng];
    }
}

export async function GET({ request }) {
    if (isDev) {
        // return the test traceroute data since there's no user IP in dev mode
        return new Promise(async (resolve) => {
            const output = await parseOutput(TEST_TRACEROUTE.trim().split("\n"));

            resolve(new Response(JSON.stringify(output), {
                headers: { "Content-Type": "application/json" }
            }));
        });
    }

    const ip = request.headers.get("cf-connecting-ip");

    if(!net.isIP(ip!)) {
        console.log("Invalid IP! Headers: ");
        console.log(request.headers);
        return error(422);
    }

    return new Promise(async (resolve) => {
        // exec(`traceroute -w 0.5 -q 1 -m 25 ${ip}`, async (err, stdout, stderr) => {
        execFile("traceroute", ["-w", "0.5", "-q", "1", "-m", "25", (ip ?? '127.0.0.1')], async (err, stdout, _stderr) => {
            if (err) {
                resolve(new Response(
                    JSON.stringify({ error: err.message }), {
                        status: 500,
                        headers: { "Content-Type": "application/json" }
                    }
                ));

                return;
            }

            const output = await parseOutput(stdout.trim().split("\n"));

            resolve(new Response(JSON.stringify(output), {
                headers: { "Content-Type": "application/json" }
            }));
        });
    });
}
