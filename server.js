// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const m3uPlaylists = [
  "https://iptv-org.github.io/iptv/countries/fr.m3u", // mettre tes liens ici
  "https://exemple.com/autre.m3u"
];

// Fonction de parsing M3U -> liste de chaînes
async function parseM3U(url) {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length);
  const channels = [];
  let currentInfo = null;

  for (let line of lines) {
    if (line.startsWith("#EXTINF:")) {
      const matchName = line.match(/,(.+)$/);
      const matchGroup = line.match(/group-title="([^"]+)"/);
      currentInfo = {
        name: matchName ? matchName[1] : "Sans nom",
        group: matchGroup ? matchGroup[1] : "Divers"
      };
    } else if (currentInfo && line.startsWith("http")) {
      currentInfo.url = line;
      channels.push(currentInfo);
      currentInfo = null;
    }
  }
  return channels;
}

// Endpoint: liste toutes les chaînes d'une playlist
app.get("/tv/:id", async (req, res) => {
  const idx = parseInt(req.params.id, 10);
  if (isNaN(idx) || idx < 0 || idx >= m3uPlaylists.length) {
    return res.status(404).json({ error: "Playlist inconnue" });
  }
  try {
    const channels = await parseM3U(m3uPlaylists[idx]);
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: "Erreur parsing M3U", details: err.message });
  }
});

app.listen(3000, () => console.log("Serveur IPTV API sur http://localhost:3000"));
