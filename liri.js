// Require modules
require("dotenv").config();
const spotAPI = require("node-spotify-api");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

// Retrieve API keys from .env
const keys = require("./keys.js");
const spotify = new spotAPI(keys.spotify);
const bandsInTownID = keys.bandsInTown.id;
const omdbID = keys.omdb.id;

// Command to process arguments
const command = process.argv[2];

// Use slice and join to properly format queries for api calls
const query = process.argv.slice(3).join(" ");

// Command class
class Command {
    constructor(run) {
        this.run = run;
    }
}

// Define commandParam
const commandParam = {
    "spotify-this-song": new Command(callSongData),
    "movie-this": new Command(callMovieData),
    "concert-this": new Command(callConcertData),
    "do-what-it-says": new Command(doWhatItSays)
}

    // Run command using the query
    if (commandParam[command]) {
        commandParam[command].run(query);
    }
    else {
        printUsage();
    }

// Use node-spotify-api to call song data
function callSongData(query) {
    if (!query) {
        query = "Rumbrave Murder by Death";
    }
    spotify.search({ type: 'track', query: query, limit: 1 }).then(response => {
        if (response.tracks.items.length < 1) {
            throw "I kin no find yer tune. Wid ya like t' try a'nuther?";
        }
        else {
            const artistName = response.tracks.items[0].artists[0].name;
            const query = response.tracks.items[0].name;
            const link = response.tracks.items[0].external_urls.spotify;
            const albumName = response.tracks.items[0].album.name;

            let output = "Artist: " + artistName;
            output += "\nSong Name: " + query;
            output += "\nLink: " + link;
            output += "\nAlbum: " + albumName;

            // Send to console and to log.txt                
            console.log(output);
            logToFile("spotify-this-song", query, output);
        }
    }).catch(error => {
        console.log(error);
    });
}

// Use axios to call concert data from bandsintown
function callConcertData(query) {
    if (!query) {
        query = "Murder by Death";
    }
    axios.get("https://rest.bandsintown.com/artists/" + query + "/events?app_id=" + bandsInTownID).then(response => {
        if (!Array.isArray(response.data) || response.data.length < 1) {
            throw "I kin no find yer show. Wid ya like t' try a'nuther?";
        }
        else {
            let output = "";
            response.data.forEach(concert => {
                output += concert.venue.name;
                output += "\n" + concert.venue.city + ", " + concert.venue.region + " " + concert.venue.country;
                // Use Moment for date formatting, because THAT's a thing
                output += "\n" + moment(concert.datetime.substr(0, 10), "YYYY-MM-DD").format("MM/DD/YYYY") + "\n\n";
            });
            output = output.trim();
            // Send to console and log.txt
            console.log(output)
            logToFile("concert-this", query, output)
        }
    }).catch(error => {
        console.log(error);
    });
}

// Use axios to call movie data from omdb
function callMovieData(query) {
    if (!query) {
        query = "Murder by Death";
    }
    axios.get("http://www.omdbapi.com/?t=" + query + "&plot=short&apikey=" + omdbID).then(response => {
        if (response.data.Response === 'False') {
            throw "I kin find nah such film. Wid ya like t' try a'nuther?";
        }
        else {
            let output = "Title: " + response.data.Title;
            output += "\nReleased: " + response.data.Year;
            output += "\nIMDB rating: " + response.data.imdbRating;
            const rottenRating = response.data.Ratings.filter(rating => rating.Source.includes("Rotten Tomatoes"))[0];
            if (rottenRating) {
                output += "\nRotten Tomatoes Rating: " + rottenRating.Value;
            }
            else {
                output += "\nRotten Tomatoes Rating: N/A";
            }
            output += "\nLanguage: " + response.data.Language;
            output += "\nPlot: " + response.data.Plot;
            output += "\nActors: " + response.data.Actors;

            // Send to console and log.txt
            console.log(output);
            logToFile("movie-this", query, output);
        }
    }).catch(error => {
        console.log(error);
    });
}

// Call from random.txt
function doWhatItSays(fileName) {
    if (!fileName) {
        fileName = "random.txt";
    }
    try {
        fs.readFile(fileName, "utf8", (error, data) => {
            if (error) throw error;
            const dataArr = data.split(",");
            const command = dataArr[0];
            const query = dataArr[1];
            // This command will loop forever and ever?
            if (command !== "do-what-it-says") { 
                fs.appendFile("log.txt", "do-what-it-says " + fileName + "\n", error => {
                    if (error) throw error;
                });
                commandParam[command].run(query);
            }
        });
    }
    catch (error) {
        console.log(error);
    }
}

// Append command and result to log.txt
function logToFile(command, searchTerm, result) {
    // Format content to append by adding command, searchTerm, result, and divider
    const output = command + " " + searchTerm + "\n" + result + "\n\n" + new Array(75).join("=") + "\n\n";
    try {
        fs.appendFile("log.txt", output, error => {
            if (error) throw error;
        });
    }
    catch (error) {
        console.log(error);
    }
}

// Print commandParam instructions to console
function printUsage() {
    console.log("USAGE:");
    console.log("node liri.js concert-this <artist/band name here>");
    console.log("node liri.js spotify-this-song <song name here>");
    console.log("node liri.js movie-this <movie name here>");
    console.log("node liri.js do-what-it-says <filename>");
}
