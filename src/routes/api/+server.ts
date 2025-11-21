import { execFile } from "node:child_process";
import net from "node:net"
import type { AirportCSV, AirportMap, CityMap, CSVCities, ProbeResult } from "$lib/api-types";
import { error } from "@sveltejs/kit";
import airports from "$lib/airports.json";
import worldCities from "$lib/cities/worldcities.json";
import Database from "better-sqlite3";

const isDev = process.env.NODE_ENV === "development";
const tryAirportAndCityMatchBeforeIpLookup = process.env.AIRPORT_CITY_FIRST === undefined ? true : process.env.AIRPORT_CITY_FIRST.toLowerCase() === "true";

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
25  *`;

const database = new Database("ips.db");

const rawCityData: CSVCities[] = worldCities as CSVCities[];
const cityData: CityMap = Object.fromEntries(rawCityData.map(city => [city.city_ascii.toLowerCase(), {...city}]));

const rawAirportData: AirportCSV[] = airports
const airportData: AirportMap = Object.fromEntries(rawAirportData.map(airport => [airport.code.toLowerCase(), {...airport}]));

function isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(part => isNaN(part) || part < 0 || part > 255)) {
        return false;
    }

    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;

    return false;
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getGeolocation(ip: string, maxRetries = 3): Promise<[number, number] | [null, null]> {
    // helper for valid coord check
    function valid(val: any): boolean {
        // return false if val is falsy except for 0, true otherwise
        return !!val || val === 0;
    }

    // helper for avoiding rate limits in api calls
    async function tryWithRetry(url: string, retries = 0): Promise<[number, number] | [null, null]> {
        try {
            const result = await fetch(url);

            if (result.status === 429) {
                if (retries >= maxRetries) {
                    console.log(`Rate limited after ${maxRetries} retries for ${url}`);
                    return [null, null];
                }

                const retryAfter = result.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000; // 5 seconds default

                console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries + 1}/${maxRetries}`);
                await sleep(waitTime);
                return tryWithRetry(url, retries + 1);
            }

            if (!result.ok) {
                console.log(`HTTP error ${result.status} for ${url}`);
                return [null, null];
            }

            const text = await result.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (parseError) {
                console.log(`JSON parse error for ${url}: ${text.substring(0, 100)}...`);
                return [null, null];
            }

            return json;
        } catch (error) {
            console.log(`Fetch error for ${url}:`, error);
            return [null, null];
        }
    }

    const ipApiResult = await tryWithRetry(`http://ip-api.com/json/${ip}?fields=status,message,lat,lon`);
    if (ipApiResult && ipApiResult !== null && typeof ipApiResult === 'object' && 'lat' in ipApiResult && 'lon' in ipApiResult) {
        const rawLatLon = [ipApiResult.lat, ipApiResult.lon];
        if (valid(rawLatLon[0]) && valid(rawLatLon[1])) {
            return rawLatLon.map(val => Number(val)) as [number, number];
        }
    }

    const ipapiResult = await tryWithRetry(`https://ipapi.co/${ip}/json/`);
    if (ipapiResult && ipapiResult !== null && typeof ipapiResult === 'object' && 'latitude' in ipapiResult && 'longitude' in ipapiResult) {
        const rawLatLon = [ipapiResult.latitude, ipapiResult.longitude];
        if (valid(rawLatLon[0]) && valid(rawLatLon[1])) {
            return rawLatLon.map(val => Number(val)) as [number, number];
        }
    }

    return [null, null];
}

async function parseOutput(lines: string[]): Promise<ProbeResult[]> {
    console.log(lines);
    const domainLocationRegex = /[a-z]{3}/g;
    let results: ProbeResult[] = [];

    for (const line of lines) {
        console.log();
        console.log(line);
        const parts = line.match(/\S+/g) || [];
        if (parts.length != 5) {
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

        if (!tryAirportAndCityMatchBeforeIpLookup) {
            const geolocation = await getLocationFromIp(ip);

            if (geolocation[0] !== null && geolocation[1] !== null) {
                result.domainAnalysis = {
                    cityOrAirport: "unknown",
                    coordinates: geolocation,
                    population: 0
                }
            }
        } else {
            for (let city of rawCityData) {
                if (domain.toLowerCase().includes(city.city.toLocaleLowerCase()) && city.city.length > 5) {
                    if (Number(city.population) > 5000 && Number(city.population) > (result.domainAnalysis?.population || 0)) {
                        console.log("Matched city " + city.city);
                        result.domainAnalysis = {
                            cityOrAirport: city.city.toLocaleLowerCase(),
                            coordinates: [Number(city.lat), Number(city.lng)],
                            population: Number(city.population)
                        }
                    }
                }
            }

            if (!result.domainAnalysis)  {
                const matches = domain.match(domainLocationRegex);
                if (matches) {
                    for (let match of matches) {
                        const replacement = KNOWN_REPLACEMENTS.get(match.toLocaleLowerCase().trim())
                        console.log(match);
                        if (replacement) {
                            match = replacement;
                        }

                        console.log("Checking match " + match);

                        const data = airportData[match.toLocaleLowerCase()];
                        if (!data || !data.url || !data.icao || Number(cityData[data.city.toLocaleLowerCase().trim()]?.population ?? 0) < 25000) {
                            console.log("Skipping airport because URL isn't there");
                        } else {
                            console.log("Match was successful!");
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

            if (!result.domainAnalysis) {
                // use ip-api geolocation
                const geolocation = await getLocationFromIp(ip);
                if (geolocation[0] !== null && geolocation[1] !== null) {
                    result.domainAnalysis = {
                        cityOrAirport: "unknown",
                        coordinates: geolocation,
                        population: 0
                    }
                }
            }
        }

        results.push(result);
    }

    console.log(results);
    return results.slice(1);
} 

async function getLocationFromIp(ip: string): Promise<[number, number] | [null, null]> {
    database.exec(`
        CREATE TABLE IF NOT EXISTS ips (
            ip          TEXT     PRIMARY KEY,
            lat         REAL,
            lng         REAL,
            is_private  INTEGER  DEFAULT 0
        )
    `)

    // @ts-expect-error
    const result: {lat: number | null, lng: number | null, is_private: number} | undefined = database.prepare("SELECT * FROM ips WHERE ip=?").get(ip);

    if (result !== undefined) {
        if (result.is_private) {
            console.log(`Found cached private IP: ${ip}`);
            return [null, null];
        }

        console.log(`Found IP ${ip} in database`);
        if (result.lat !== null && result.lng !== null) {
            return [result.lat, result.lng];
        } else {
            return [null, null];
        }
    } else {
        console.log(`Processing IP '${ip}'`);

        if (isPrivateIP(ip)) {
            console.log(`Caching private IP: ${ip}`);
            database.prepare("INSERT INTO ips (ip, lat, lng, is_private) VALUES (?, ?, ?, ?)").run(ip, null, null, 1);
            return [null, null];
        }

        console.log(`Getting geolocation for IP '${ip}'`);
        const coords = await getGeolocation(ip);

        database.prepare("INSERT INTO ips (ip, lat, lng, is_private) VALUES (?, ?, ?, ?)").run(ip, coords[0], coords[1], 0);

        return coords;
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

    const ip = request.headers.get("CF-Connecting-IP") || "127.0.0.1";

    if (!net.isIP(ip)) {
        console.log("Invalid IP! Headers: ");
        console.log(request.headers);
        return error(422);
    }

    return new Promise(async (resolve) => {
        execFile("traceroute", ["-w", "0.5", "-q", "1", "-m", "25", ip], async (err, stdout, _stderr) => {
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
