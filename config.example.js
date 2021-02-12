module.exports = {
  radarr: {
    url: "http://127.0.0.1:7878",
    apiKey: "xxxxx",
    storeFileName: "radarr", // file name used to store processed content
  },
  sonarr: {
    url: "http://127.0.0.1:8989",
    apiKey: "xxxx",
    storeFileName: "sonarr", // file name used to store processed content
  },
  seedbox: {
    url: "http://127.0.0.1:8080",
    username: "admin",
    password: "adminadmin",
    client: "qbittorrent",
  },
  global: {
    blackListIndexers: [], // dont find cross seeds from these indexers
    whiteListIndexers: [], // ONLY find cross seeds from these indexers
    sizeThreshold: 0.6, // how much smaller or larger a torrent can be to be a 'match' (in GB)
    matchByReleaseGroup: false, // use release group to further narrow down matches (may not be 100% reliable)
    skipHashChecking: false, // skips the client's hash checking - use at own risk
    removeAboveNumberOfFiles: 0, // if graater than 0, after adding all matching torrents will remove all torrents with more than this number of files
    quality: [], // only sync content that matches there quality. case insenstive and partial matching
  },
};
