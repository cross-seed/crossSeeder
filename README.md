## Cross Seeder

This program will use Radarr to find movies currently downloaded and search through each of your indexers setup in Radarr for similar matching torrents. 
It does this by looking at the torrent sizes and adding torrents close to your downloaded torrent size. 
Afterwards, you can review the torrent added to rename, delete, or start torrent found.
By default crossSeeder will find cross seeds for all indexers in Radarr. You can tell crossSeeder to only cross seed indexers from a white list via `whiteListIndexers` or skip indexers from a black list via `blackListIndexers`.

## Installation

* Requires `node.js` v8 or above
* Run `npm install`
* copy the `config.example.js` file to `config.js`
* add your Radarr url and api key
* add your qBittorrent username, password, and url
  
## Usage
* Run `npm start` to start cross seeder

## Advanced Usage

Cross seeder will use Radarr to search for potential movie matches to cross seed. First it will filter out any results found from Radarr by quality. So if the quality of your download is `bluray-1080p` then only `bluray-1080p` matches will be considered.

Next, `sizeThreshold` is the largest difference in GB that a torrent will be a 'match'. For example, if you have a torrent that is 5.5GB in size then any torrent found through Radarr that is between 4.9 and 6.1 GB will be considered a match. This is to make sure samples files, subtitles, etc are taken into account. You can adjust this to your desire in the settings via the `sizeThreshold` config. The current default may give you a bunch of false positives but all torrents added are paused by default for you to review. If a real match is found, your torrent client will start checking the files. If not a match, then it will just remained paused for you to manage it. I personally would rather have false positives than get false negatives (thus missing out on cross seeding).

When finding a cross seed match, the release group is not used because it is not 100% reliable. I personally rather find as many matches as possible and delete the ones that aren't a match. You can enable to ALSO match by release group with `matchByReleaseGroup` set to `true`.

## Development
Due to professional software and a growing number of open source obligations, I won't have time to maintain this project. This was just asomething I wanted to share to others that might find it just as useful as I do. That being said, I will accept pull requests for new features and may find time for small bug fixes. For reference, the features I'd like to see at the moment are:

* rtorrent and deluge integration
* better non tech friendly way to set settings that don't use JSON
* more detailed installation and usage instructions with pictures