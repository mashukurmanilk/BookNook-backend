import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

dns.resolveSrv(
  '_mongodb._tcp.cluster0.jcsvfv3.mongodb.net',
  (err, addresses) => {
    if (err) {
      console.log("DNS Error:", err);
      return;
    }

    console.log("MongoDB SRV Records:", addresses);
  }
);