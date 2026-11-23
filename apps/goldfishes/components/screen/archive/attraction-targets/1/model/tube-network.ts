export type TubeLineId = "bakerloo" | "central" | "circle" | "district" | "hammersmith-city" | "jubilee" | "metropolitan" | "northern" | "piccadilly" | "victoria" | "waterloo-city";

export type TubeLine = {
  id: TubeLineId;
  name: string;
  color: string;
};

export type TubeStation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lineIds: TubeLineId[];
};

export type TubeRoute = {
  id: string;
  lineId: TubeLineId;
  stationIds: string[];
};

export type TubeLinePath = {
  id: string;
  lineId: TubeLineId;
  color: string;
  points: readonly { x: number; y: number }[];
};

export type TubeStationStack = {
  id: string;
  lineIds: readonly TubeLineId[];
  x: number;
  y: number;
};

export const TUBE_LINES: readonly TubeLine[] = [
  {
    "id": "bakerloo",
    "name": "Bakerloo",
    "color": "#b77833"
  },
  {
    "id": "central",
    "name": "Central",
    "color": "#e84d42"
  },
  {
    "id": "circle",
    "name": "Circle",
    "color": "#f5d547"
  },
  {
    "id": "district",
    "name": "District",
    "color": "#20a665"
  },
  {
    "id": "hammersmith-city",
    "name": "Hammersmith & City",
    "color": "#f6b8cb"
  },
  {
    "id": "jubilee",
    "name": "Jubilee",
    "color": "#a5a8ab"
  },
  {
    "id": "metropolitan",
    "name": "Metropolitan",
    "color": "#c33e82"
  },
  {
    "id": "northern",
    "name": "Northern",
    "color": "#d7dce0"
  },
  {
    "id": "piccadilly",
    "name": "Piccadilly",
    "color": "#3159c6"
  },
  {
    "id": "victoria",
    "name": "Victoria",
    "color": "#39b7e5"
  },
  {
    "id": "waterloo-city",
    "name": "Waterloo & City",
    "color": "#92d5c6"
  }
];

export const TUBE_STATIONS: readonly TubeStation[] = [
  {
    "id": "940GZZLUACT",
    "name": "Acton Town",
    "latitude": 51.503057,
    "longitude": -0.280462,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUALD",
    "name": "Aldgate",
    "latitude": 51.514246,
    "longitude": -0.075689,
    "lineIds": [
      "circle",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUADE",
    "name": "Aldgate East",
    "latitude": 51.515037,
    "longitude": -0.072384,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUALP",
    "name": "Alperton",
    "latitude": 51.540627,
    "longitude": -0.29961,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUAMS",
    "name": "Amersham",
    "latitude": 51.674126,
    "longitude": -0.607714,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUAGL",
    "name": "Angel",
    "latitude": 51.532624,
    "longitude": -0.105898,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUACY",
    "name": "Archway",
    "latitude": 51.565478,
    "longitude": -0.134819,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUASG",
    "name": "Arnos Grove",
    "latitude": 51.616446,
    "longitude": -0.133062,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUASL",
    "name": "Arsenal",
    "latitude": 51.558655,
    "longitude": -0.107457,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUBST",
    "name": "Baker Street",
    "latitude": 51.522883,
    "longitude": -0.15713,
    "lineIds": [
      "bakerloo",
      "circle",
      "hammersmith-city",
      "jubilee",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUBLM",
    "name": "Balham",
    "latitude": 51.443288,
    "longitude": -0.152997,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUBNK",
    "name": "Bank",
    "latitude": 51.513132,
    "longitude": -0.090047,
    "lineIds": [
      "central",
      "northern",
      "waterloo-city"
    ]
  },
  {
    "id": "940GZZLUBBN",
    "name": "Barbican",
    "latitude": 51.520275,
    "longitude": -0.097993,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUBKG",
    "name": "Barking",
    "latitude": 51.539321,
    "longitude": 0.081053,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUBKE",
    "name": "Barkingside",
    "latitude": 51.585689,
    "longitude": 0.088585,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUBSC",
    "name": "Barons Court",
    "latitude": 51.490311,
    "longitude": -0.213427,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZBPSUST",
    "name": "Battersea Power Station",
    "latitude": 51.479932,
    "longitude": -0.142142,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUBWT",
    "name": "Bayswater",
    "latitude": 51.512284,
    "longitude": -0.187938,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUBEC",
    "name": "Becontree",
    "latitude": 51.540331,
    "longitude": 0.127016,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUBZP",
    "name": "Belsize Park",
    "latitude": 51.550241,
    "longitude": -0.164766,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUBMY",
    "name": "Bermondsey",
    "latitude": 51.49775,
    "longitude": -0.063993,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUBLG",
    "name": "Bethnal Green",
    "latitude": 51.527222,
    "longitude": -0.055506,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUBKF",
    "name": "Blackfriars",
    "latitude": 51.511581,
    "longitude": -0.103659,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUBLR",
    "name": "Blackhorse Road",
    "latitude": 51.586919,
    "longitude": -0.04115,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUBND",
    "name": "Bond Street",
    "latitude": 51.514304,
    "longitude": -0.149723,
    "lineIds": [
      "central",
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUBOR",
    "name": "Borough",
    "latitude": 51.501199,
    "longitude": -0.09337,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUBOS",
    "name": "Boston Manor",
    "latitude": 51.495635,
    "longitude": -0.324939,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUBDS",
    "name": "Bounds Green",
    "latitude": 51.607034,
    "longitude": -0.124235,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUBWR",
    "name": "Bow Road",
    "latitude": 51.52694,
    "longitude": -0.025128,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUBTX",
    "name": "Brent Cross",
    "latitude": 51.57665,
    "longitude": -0.213622,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUBXN",
    "name": "Brixton",
    "latitude": 51.462618,
    "longitude": -0.114888,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUBBB",
    "name": "Bromley-by-Bow",
    "latitude": 51.524839,
    "longitude": -0.011538,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUBKH",
    "name": "Buckhurst Hill",
    "latitude": 51.626605,
    "longitude": 0.046757,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUBTK",
    "name": "Burnt Oak",
    "latitude": 51.602774,
    "longitude": -0.264048,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCAR",
    "name": "Caledonian Road",
    "latitude": 51.548519,
    "longitude": -0.118493,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUCTN",
    "name": "Camden Town",
    "latitude": 51.539292,
    "longitude": -0.14274,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCWR",
    "name": "Canada Water",
    "latitude": 51.497931,
    "longitude": -0.049405,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUCYF",
    "name": "Canary Wharf",
    "latitude": 51.503488,
    "longitude": -0.018246,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUCGT",
    "name": "Canning Town",
    "latitude": 51.513584,
    "longitude": 0.008322,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUCST",
    "name": "Cannon Street",
    "latitude": 51.51151,
    "longitude": -0.090432,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUCPK",
    "name": "Canons Park",
    "latitude": 51.607701,
    "longitude": -0.294693,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUCAL",
    "name": "Chalfont & Latimer",
    "latitude": 51.667985,
    "longitude": -0.560689,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUCFM",
    "name": "Chalk Farm",
    "latitude": 51.544118,
    "longitude": -0.153388,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCHL",
    "name": "Chancery Lane",
    "latitude": 51.518247,
    "longitude": -0.111583,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUCHX",
    "name": "Charing Cross",
    "latitude": 51.50741,
    "longitude": -0.127277,
    "lineIds": [
      "bakerloo",
      "northern"
    ]
  },
  {
    "id": "940GZZLUCSM",
    "name": "Chesham",
    "latitude": 51.705208,
    "longitude": -0.611247,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUCWL",
    "name": "Chigwell",
    "latitude": 51.617916,
    "longitude": 0.075041,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUCWP",
    "name": "Chiswick Park",
    "latitude": 51.494627,
    "longitude": -0.267972,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUCYD",
    "name": "Chorleywood",
    "latitude": 51.654358,
    "longitude": -0.518461,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUCPC",
    "name": "Clapham Common",
    "latitude": 51.461742,
    "longitude": -0.138317,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCPN",
    "name": "Clapham North",
    "latitude": 51.465135,
    "longitude": -0.130016,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCPS",
    "name": "Clapham South",
    "latitude": 51.452654,
    "longitude": -0.147582,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCKS",
    "name": "Cockfosters",
    "latitude": 51.65152,
    "longitude": -0.149171,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUCND",
    "name": "Colindale",
    "latitude": 51.595424,
    "longitude": -0.249919,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCSD",
    "name": "Colliers Wood",
    "latitude": 51.41816,
    "longitude": -0.178086,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUCGN",
    "name": "Covent Garden",
    "latitude": 51.513093,
    "longitude": -0.124436,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUCXY",
    "name": "Croxley",
    "latitude": 51.647044,
    "longitude": -0.441718,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUDGE",
    "name": "Dagenham East",
    "latitude": 51.544096,
    "longitude": 0.166017,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUDGY",
    "name": "Dagenham Heathway",
    "latitude": 51.541639,
    "longitude": 0.147527,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUDBN",
    "name": "Debden",
    "latitude": 51.645386,
    "longitude": 0.083782,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUDOH",
    "name": "Dollis Hill",
    "latitude": 51.551955,
    "longitude": -0.239068,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUEBY",
    "name": "Ealing Broadway",
    "latitude": 51.515017,
    "longitude": -0.301457,
    "lineIds": [
      "central",
      "district"
    ]
  },
  {
    "id": "940GZZLUECM",
    "name": "Ealing Common",
    "latitude": 51.51014,
    "longitude": -0.288265,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUECT",
    "name": "Earl's Court",
    "latitude": 51.492063,
    "longitude": -0.193378,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUEAN",
    "name": "East Acton",
    "latitude": 51.516612,
    "longitude": -0.247248,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUEFY",
    "name": "East Finchley",
    "latitude": 51.587131,
    "longitude": -0.165012,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUEHM",
    "name": "East Ham",
    "latitude": 51.538948,
    "longitude": 0.051186,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUEPY",
    "name": "East Putney",
    "latitude": 51.459205,
    "longitude": -0.211,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUEAE",
    "name": "Eastcote",
    "latitude": 51.576506,
    "longitude": -0.397373,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUEGW",
    "name": "Edgware",
    "latitude": 51.613653,
    "longitude": -0.274928,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUERB",
    "name": "Edgware Road (Bakerloo)",
    "latitude": 51.520299,
    "longitude": -0.17015,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUERC",
    "name": "Edgware Road (Circle Line)",
    "latitude": 51.519858,
    "longitude": -0.167832,
    "lineIds": [
      "circle",
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUEAC",
    "name": "Elephant & Castle",
    "latitude": 51.494536,
    "longitude": -0.100606,
    "lineIds": [
      "bakerloo",
      "northern"
    ]
  },
  {
    "id": "940GZZLUEPK",
    "name": "Elm Park",
    "latitude": 51.549775,
    "longitude": 0.19864,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUEMB",
    "name": "Embankment",
    "latitude": 51.507058,
    "longitude": -0.122666,
    "lineIds": [
      "bakerloo",
      "circle",
      "district",
      "northern"
    ]
  },
  {
    "id": "940GZZLUEPG",
    "name": "Epping",
    "latitude": 51.69368,
    "longitude": 0.113767,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUEUS",
    "name": "Euston",
    "latitude": 51.527999,
    "longitude": -0.133785,
    "lineIds": [
      "northern",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUESQ",
    "name": "Euston Square",
    "latitude": 51.525604,
    "longitude": -0.135829,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUFLP",
    "name": "Fairlop",
    "latitude": 51.595618,
    "longitude": 0.091004,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUFCN",
    "name": "Farringdon",
    "latitude": 51.520252,
    "longitude": -0.104913,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUFYC",
    "name": "Finchley Central",
    "latitude": 51.600921,
    "longitude": -0.192527,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUFYR",
    "name": "Finchley Road",
    "latitude": 51.546825,
    "longitude": -0.179845,
    "lineIds": [
      "jubilee",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUFPK",
    "name": "Finsbury Park",
    "latitude": 51.564158,
    "longitude": -0.106825,
    "lineIds": [
      "piccadilly",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUFBY",
    "name": "Fulham Broadway",
    "latitude": 51.480081,
    "longitude": -0.195422,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUGTH",
    "name": "Gants Hill",
    "latitude": 51.576544,
    "longitude": 0.066185,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUGTR",
    "name": "Gloucester Road",
    "latitude": 51.494316,
    "longitude": -0.182658,
    "lineIds": [
      "circle",
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUGGN",
    "name": "Golders Green",
    "latitude": 51.572259,
    "longitude": -0.194039,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUGHK",
    "name": "Goldhawk Road",
    "latitude": 51.502005,
    "longitude": -0.226715,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUGDG",
    "name": "Goodge Street",
    "latitude": 51.520599,
    "longitude": -0.134361,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUGGH",
    "name": "Grange Hill",
    "latitude": 51.613378,
    "longitude": 0.092066,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUGPS",
    "name": "Great Portland Street",
    "latitude": 51.52384,
    "longitude": -0.144262,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUGPK",
    "name": "Green Park",
    "latitude": 51.506947,
    "longitude": -0.142787,
    "lineIds": [
      "jubilee",
      "piccadilly",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUGFD",
    "name": "Greenford",
    "latitude": 51.542424,
    "longitude": -0.34605,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUGBY",
    "name": "Gunnersbury",
    "latitude": 51.491803,
    "longitude": -0.275267,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUHLT",
    "name": "Hainault",
    "latitude": 51.603659,
    "longitude": 0.093482,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUHSD",
    "name": "Hammersmith (Dist&Picc Line)",
    "latitude": 51.4923,
    "longitude": -0.22362,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHSC",
    "name": "Hammersmith (H&C Line)",
    "latitude": 51.49339,
    "longitude": -0.22503,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUHTD",
    "name": "Hampstead",
    "latitude": 51.556239,
    "longitude": -0.177464,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUHGR",
    "name": "Hanger Lane",
    "latitude": 51.530177,
    "longitude": -0.292704,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUHSN",
    "name": "Harlesden",
    "latitude": 51.53631,
    "longitude": -0.257883,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUHAW",
    "name": "Harrow & Wealdstone",
    "latitude": 51.592268,
    "longitude": -0.335217,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUHOH",
    "name": "Harrow-on-the-Hill",
    "latitude": 51.579195,
    "longitude": -0.337225,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUHNX",
    "name": "Hatton Cross",
    "latitude": 51.466747,
    "longitude": -0.423191,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHR4",
    "name": "Heathrow Terminal 4",
    "latitude": 51.458524,
    "longitude": -0.445771,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHR5",
    "name": "Heathrow Terminal 5",
    "latitude": 51.470052,
    "longitude": -0.49056,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHRC",
    "name": "Heathrow Terminals 2 & 3",
    "latitude": 51.471235,
    "longitude": -0.452265,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHCL",
    "name": "Hendon Central",
    "latitude": 51.583301,
    "longitude": -0.226424,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUHBT",
    "name": "High Barnet",
    "latitude": 51.650541,
    "longitude": -0.194298,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUHSK",
    "name": "High Street Kensington",
    "latitude": 51.501055,
    "longitude": -0.192792,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUHAI",
    "name": "Highbury & Islington",
    "latitude": 51.54635,
    "longitude": -0.103324,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUHGT",
    "name": "Highgate",
    "latitude": 51.577532,
    "longitude": -0.145857,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUHGD",
    "name": "Hillingdon",
    "latitude": 51.553715,
    "longitude": -0.449828,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHBN",
    "name": "Holborn",
    "latitude": 51.51758,
    "longitude": -0.120475,
    "lineIds": [
      "central",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHPK",
    "name": "Holland Park",
    "latitude": 51.507143,
    "longitude": -0.205679,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUHWY",
    "name": "Holloway Road",
    "latitude": 51.552697,
    "longitude": -0.113244,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHCH",
    "name": "Hornchurch",
    "latitude": 51.554093,
    "longitude": 0.219116,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUHWC",
    "name": "Hounslow Central",
    "latitude": 51.471295,
    "longitude": -0.366578,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHWE",
    "name": "Hounslow East",
    "latitude": 51.473213,
    "longitude": -0.356474,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHWT",
    "name": "Hounslow West",
    "latitude": 51.473469,
    "longitude": -0.386544,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUHPC",
    "name": "Hyde Park Corner",
    "latitude": 51.503035,
    "longitude": -0.152441,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUICK",
    "name": "Ickenham",
    "latitude": 51.561992,
    "longitude": -0.442001,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUKNG",
    "name": "Kennington",
    "latitude": 51.488337,
    "longitude": -0.105963,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUKSL",
    "name": "Kensal Green",
    "latitude": 51.530539,
    "longitude": -0.225016,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUKOY",
    "name": "Kensington (Olympia)",
    "latitude": 51.497624,
    "longitude": -0.210015,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUKSH",
    "name": "Kentish Town",
    "latitude": 51.550312,
    "longitude": -0.140733,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUKEN",
    "name": "Kenton",
    "latitude": 51.581756,
    "longitude": -0.31691,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUKWG",
    "name": "Kew Gardens",
    "latitude": 51.477058,
    "longitude": -0.285241,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUKBN",
    "name": "Kilburn",
    "latitude": 51.547183,
    "longitude": -0.204248,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUKPK",
    "name": "Kilburn Park",
    "latitude": 51.534979,
    "longitude": -0.194232,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUKSX",
    "name": "King's Cross St. Pancras",
    "latitude": 51.530663,
    "longitude": -0.123194,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan",
      "northern",
      "piccadilly",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUKBY",
    "name": "Kingsbury",
    "latitude": 51.584845,
    "longitude": -0.27879,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUKNB",
    "name": "Knightsbridge",
    "latitude": 51.501669,
    "longitude": -0.160508,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLULAD",
    "name": "Ladbroke Grove",
    "latitude": 51.517449,
    "longitude": -0.210391,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLULBN",
    "name": "Lambeth North",
    "latitude": 51.498808,
    "longitude": -0.112315,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLULGT",
    "name": "Lancaster Gate",
    "latitude": 51.511723,
    "longitude": -0.175494,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLULRD",
    "name": "Latimer Road",
    "latitude": 51.513389,
    "longitude": -0.217799,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLULSQ",
    "name": "Leicester Square",
    "latitude": 51.511386,
    "longitude": -0.128426,
    "lineIds": [
      "northern",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLULYN",
    "name": "Leyton",
    "latitude": 51.556589,
    "longitude": -0.005523,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLULYS",
    "name": "Leytonstone",
    "latitude": 51.568324,
    "longitude": 0.008194,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLULVT",
    "name": "Liverpool Street",
    "latitude": 51.517372,
    "longitude": -0.083182,
    "lineIds": [
      "central",
      "circle",
      "hammersmith-city",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLULNB",
    "name": "London Bridge",
    "latitude": 51.505721,
    "longitude": -0.088873,
    "lineIds": [
      "jubilee",
      "northern"
    ]
  },
  {
    "id": "940GZZLULGN",
    "name": "Loughton",
    "latitude": 51.641443,
    "longitude": 0.055476,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUMVL",
    "name": "Maida Vale",
    "latitude": 51.529777,
    "longitude": -0.185758,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUMRH",
    "name": "Manor House",
    "latitude": 51.570738,
    "longitude": -0.096118,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUMSH",
    "name": "Mansion House",
    "latitude": 51.512117,
    "longitude": -0.094009,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUMBA",
    "name": "Marble Arch",
    "latitude": 51.513424,
    "longitude": -0.158953,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUMYB",
    "name": "Marylebone",
    "latitude": 51.522322,
    "longitude": -0.163207,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUMED",
    "name": "Mile End",
    "latitude": 51.525122,
    "longitude": -0.03364,
    "lineIds": [
      "central",
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUMHL",
    "name": "Mill Hill East",
    "latitude": 51.608229,
    "longitude": -0.209986,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUMMT",
    "name": "Monument",
    "latitude": 51.5107,
    "longitude": -0.085969,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUMPK",
    "name": "Moor Park",
    "latitude": 51.629845,
    "longitude": -0.432454,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUMGT",
    "name": "Moorgate",
    "latitude": 51.518176,
    "longitude": -0.088322,
    "lineIds": [
      "circle",
      "hammersmith-city",
      "metropolitan",
      "northern"
    ]
  },
  {
    "id": "940GZZLUMDN",
    "name": "Morden",
    "latitude": 51.402142,
    "longitude": -0.194839,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUMTC",
    "name": "Mornington Crescent",
    "latitude": 51.534679,
    "longitude": -0.138789,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUNDN",
    "name": "Neasden",
    "latitude": 51.553986,
    "longitude": -0.249837,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUNBP",
    "name": "Newbury Park",
    "latitude": 51.575726,
    "longitude": 0.090004,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZNEUGST",
    "name": "Nine Elms",
    "latitude": 51.479912,
    "longitude": -0.128476,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUNAN",
    "name": "North Acton",
    "latitude": 51.523524,
    "longitude": -0.259755,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUNEN",
    "name": "North Ealing",
    "latitude": 51.517505,
    "longitude": -0.288868,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUNGW",
    "name": "North Greenwich",
    "latitude": 51.50047,
    "longitude": 0.004287,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUNHA",
    "name": "North Harrow",
    "latitude": 51.584872,
    "longitude": -0.362408,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUNWY",
    "name": "North Wembley",
    "latitude": 51.562551,
    "longitude": -0.304,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUNFD",
    "name": "Northfields",
    "latitude": 51.499319,
    "longitude": -0.314719,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUNHT",
    "name": "Northolt",
    "latitude": 51.548236,
    "longitude": -0.368699,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUNKP",
    "name": "Northwick Park",
    "latitude": 51.578481,
    "longitude": -0.318056,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUNOW",
    "name": "Northwood",
    "latitude": 51.611053,
    "longitude": -0.423829,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUNWH",
    "name": "Northwood Hills",
    "latitude": 51.600572,
    "longitude": -0.409464,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUNHG",
    "name": "Notting Hill Gate",
    "latitude": 51.509128,
    "longitude": -0.196104,
    "lineIds": [
      "central",
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUOAK",
    "name": "Oakwood",
    "latitude": 51.647726,
    "longitude": -0.132182,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUODS",
    "name": "Old Street",
    "latitude": 51.525864,
    "longitude": -0.08777,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUOSY",
    "name": "Osterley",
    "latitude": 51.481274,
    "longitude": -0.352224,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUOVL",
    "name": "Oval",
    "latitude": 51.48185,
    "longitude": -0.112439,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUOXC",
    "name": "Oxford Circus",
    "latitude": 51.515224,
    "longitude": -0.141903,
    "lineIds": [
      "bakerloo",
      "central",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUPAC",
    "name": "Paddington",
    "latitude": 51.516581,
    "longitude": -0.175689,
    "lineIds": [
      "bakerloo",
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUPAH",
    "name": "Paddington (H&C Line)-Underground",
    "latitude": 51.518187,
    "longitude": -0.178306,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUPKR",
    "name": "Park Royal",
    "latitude": 51.527123,
    "longitude": -0.284341,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUPSG",
    "name": "Parsons Green",
    "latitude": 51.475277,
    "longitude": -0.20117,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUPVL",
    "name": "Perivale",
    "latitude": 51.536717,
    "longitude": -0.323446,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUPCC",
    "name": "Piccadilly Circus",
    "latitude": 51.51005,
    "longitude": -0.133798,
    "lineIds": [
      "bakerloo",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUPCO",
    "name": "Pimlico",
    "latitude": 51.489097,
    "longitude": -0.133761,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUPNR",
    "name": "Pinner",
    "latitude": 51.592901,
    "longitude": -0.381161,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUPLW",
    "name": "Plaistow",
    "latitude": 51.531341,
    "longitude": 0.017451,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUPRD",
    "name": "Preston Road",
    "latitude": 51.571972,
    "longitude": -0.295107,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUPYB",
    "name": "Putney Bridge",
    "latitude": 51.468262,
    "longitude": -0.208731,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUQPS",
    "name": "Queen's Park",
    "latitude": 51.534158,
    "longitude": -0.204574,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUQBY",
    "name": "Queensbury",
    "latitude": 51.594188,
    "longitude": -0.286219,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUQWY",
    "name": "Queensway",
    "latitude": 51.510312,
    "longitude": -0.187152,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLURVP",
    "name": "Ravenscourt Park",
    "latitude": 51.494122,
    "longitude": -0.235881,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLURYL",
    "name": "Rayners Lane",
    "latitude": 51.575147,
    "longitude": -0.371127,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLURBG",
    "name": "Redbridge",
    "latitude": 51.576243,
    "longitude": 0.04536,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLURGP",
    "name": "Regent's Park",
    "latitude": 51.523344,
    "longitude": -0.146444,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLURMD",
    "name": "Richmond",
    "latitude": 51.463237,
    "longitude": -0.301336,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLURKW",
    "name": "Rickmansworth",
    "latitude": 51.640207,
    "longitude": -0.473703,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLURVY",
    "name": "Roding Valley",
    "latitude": 51.617199,
    "longitude": 0.043647,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLURYO",
    "name": "Royal Oak",
    "latitude": 51.519113,
    "longitude": -0.188748,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLURSP",
    "name": "Ruislip",
    "latitude": 51.571354,
    "longitude": -0.421898,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLURSG",
    "name": "Ruislip Gardens",
    "latitude": 51.560736,
    "longitude": -0.41071,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLURSM",
    "name": "Ruislip Manor",
    "latitude": 51.573202,
    "longitude": -0.412973,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLURSQ",
    "name": "Russell Square",
    "latitude": 51.523073,
    "longitude": -0.124285,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSVS",
    "name": "Seven Sisters",
    "latitude": 51.58333,
    "longitude": -0.072584,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUSBC",
    "name": "Shepherd's Bush (Central)",
    "latitude": 51.504376,
    "longitude": -0.218813,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUSBM",
    "name": "Shepherd's Bush Market",
    "latitude": 51.505579,
    "longitude": -0.226375,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUSSQ",
    "name": "Sloane Square",
    "latitude": 51.49227,
    "longitude": -0.156377,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUSNB",
    "name": "Snaresbrook",
    "latitude": 51.580678,
    "longitude": 0.02144,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUSEA",
    "name": "South Ealing",
    "latitude": 51.501003,
    "longitude": -0.307424,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSHH",
    "name": "South Harrow",
    "latitude": 51.564888,
    "longitude": -0.352492,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSKS",
    "name": "South Kensington",
    "latitude": 51.494094,
    "longitude": -0.174138,
    "lineIds": [
      "circle",
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSKT",
    "name": "South Kenton",
    "latitude": 51.570232,
    "longitude": -0.308433,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUSRP",
    "name": "South Ruislip",
    "latitude": 51.556853,
    "longitude": -0.398915,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUSWN",
    "name": "South Wimbledon",
    "latitude": 51.415309,
    "longitude": -0.192005,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUSWF",
    "name": "South Woodford",
    "latitude": 51.591907,
    "longitude": 0.027338,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUSFS",
    "name": "Southfields",
    "latitude": 51.445073,
    "longitude": -0.206602,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUSGT",
    "name": "Southgate",
    "latitude": 51.632315,
    "longitude": -0.127816,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSWK",
    "name": "Southwark",
    "latitude": 51.50427,
    "longitude": -0.105331,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUSJP",
    "name": "St. James's Park",
    "latitude": 51.499544,
    "longitude": -0.133608,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUSJW",
    "name": "St. John's Wood",
    "latitude": 51.534521,
    "longitude": -0.173948,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUSPU",
    "name": "St. Paul's",
    "latitude": 51.514936,
    "longitude": -0.097567,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUSFB",
    "name": "Stamford Brook",
    "latitude": 51.494917,
    "longitude": -0.245704,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUSTM",
    "name": "Stanmore",
    "latitude": 51.619839,
    "longitude": -0.303266,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUSGN",
    "name": "Stepney Green",
    "latitude": 51.521858,
    "longitude": -0.046596,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUSKW",
    "name": "Stockwell",
    "latitude": 51.472184,
    "longitude": -0.122644,
    "lineIds": [
      "northern",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUSGP",
    "name": "Stonebridge Park",
    "latitude": 51.543959,
    "longitude": -0.275892,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUSTD",
    "name": "Stratford",
    "latitude": 51.541806,
    "longitude": -0.003458,
    "lineIds": [
      "central",
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUSUH",
    "name": "Sudbury Hill",
    "latitude": 51.556946,
    "longitude": -0.336435,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSUT",
    "name": "Sudbury Town",
    "latitude": 51.550815,
    "longitude": -0.315745,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUSWC",
    "name": "Swiss Cottage",
    "latitude": 51.543681,
    "longitude": -0.174894,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUTMP",
    "name": "Temple",
    "latitude": 51.511006,
    "longitude": -0.11426,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUTHB",
    "name": "Theydon Bois",
    "latitude": 51.671759,
    "longitude": 0.103085,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUTBC",
    "name": "Tooting Bec",
    "latitude": 51.435678,
    "longitude": -0.159736,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUTBY",
    "name": "Tooting Broadway",
    "latitude": 51.42763,
    "longitude": -0.168374,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUTCR",
    "name": "Tottenham Court Road",
    "latitude": 51.516426,
    "longitude": -0.13041,
    "lineIds": [
      "central",
      "northern"
    ]
  },
  {
    "id": "940GZZLUTMH",
    "name": "Tottenham Hale",
    "latitude": 51.588108,
    "longitude": -0.060241,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUTAW",
    "name": "Totteridge & Whetstone",
    "latitude": 51.630597,
    "longitude": -0.17921,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUTWH",
    "name": "Tower Hill",
    "latitude": 51.509971,
    "longitude": -0.076546,
    "lineIds": [
      "circle",
      "district"
    ]
  },
  {
    "id": "940GZZLUTFP",
    "name": "Tufnell Park",
    "latitude": 51.556822,
    "longitude": -0.138433,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUTNG",
    "name": "Turnham Green",
    "latitude": 51.495148,
    "longitude": -0.254555,
    "lineIds": [
      "district",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUTPN",
    "name": "Turnpike Lane",
    "latitude": 51.590272,
    "longitude": -0.102953,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUUPM",
    "name": "Upminster",
    "latitude": 51.559063,
    "longitude": 0.250882,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUUPB",
    "name": "Upminster Bridge",
    "latitude": 51.55856,
    "longitude": 0.235809,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUUPY",
    "name": "Upney",
    "latitude": 51.538372,
    "longitude": 0.10153,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUUPK",
    "name": "Upton Park",
    "latitude": 51.53534,
    "longitude": 0.035263,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUUXB",
    "name": "Uxbridge",
    "latitude": 51.546565,
    "longitude": -0.477949,
    "lineIds": [
      "metropolitan",
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUVXL",
    "name": "Vauxhall",
    "latitude": 51.485743,
    "longitude": -0.124204,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUVIC",
    "name": "Victoria",
    "latitude": 51.496359,
    "longitude": -0.143102,
    "lineIds": [
      "circle",
      "district",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUWWL",
    "name": "Walthamstow Central",
    "latitude": 51.582965,
    "longitude": -0.019885,
    "lineIds": [
      "victoria"
    ]
  },
  {
    "id": "940GZZLUWSD",
    "name": "Wanstead",
    "latitude": 51.575501,
    "longitude": 0.028527,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUWRR",
    "name": "Warren Street",
    "latitude": 51.524951,
    "longitude": -0.138321,
    "lineIds": [
      "northern",
      "victoria"
    ]
  },
  {
    "id": "940GZZLUWKA",
    "name": "Warwick Avenue",
    "latitude": 51.523263,
    "longitude": -0.183783,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUWLO",
    "name": "Waterloo",
    "latitude": 51.503299,
    "longitude": -0.11478,
    "lineIds": [
      "bakerloo",
      "jubilee",
      "northern",
      "waterloo-city"
    ]
  },
  {
    "id": "940GZZLUWAF",
    "name": "Watford",
    "latitude": 51.657446,
    "longitude": -0.417377,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUWYC",
    "name": "Wembley Central",
    "latitude": 51.552304,
    "longitude": -0.296852,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUWYP",
    "name": "Wembley Park",
    "latitude": 51.563198,
    "longitude": -0.279262,
    "lineIds": [
      "jubilee",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUWTA",
    "name": "West Acton",
    "latitude": 51.518001,
    "longitude": -0.28098,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUWBN",
    "name": "West Brompton",
    "latitude": 51.487268,
    "longitude": -0.195599,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUWFN",
    "name": "West Finchley",
    "latitude": 51.609426,
    "longitude": -0.188362,
    "lineIds": [
      "northern"
    ]
  },
  {
    "id": "940GZZLUWHM",
    "name": "West Ham",
    "latitude": 51.528136,
    "longitude": 0.005055,
    "lineIds": [
      "district",
      "hammersmith-city",
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUWHP",
    "name": "West Hampstead",
    "latitude": 51.546638,
    "longitude": -0.191059,
    "lineIds": [
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUWHW",
    "name": "West Harrow",
    "latitude": 51.57971,
    "longitude": -0.3534,
    "lineIds": [
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUWKN",
    "name": "West Kensington",
    "latitude": 51.490459,
    "longitude": -0.206636,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUWRP",
    "name": "West Ruislip",
    "latitude": 51.569688,
    "longitude": -0.437886,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUWSP",
    "name": "Westbourne Park",
    "latitude": 51.52111,
    "longitude": -0.201065,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUWSM",
    "name": "Westminster",
    "latitude": 51.50132,
    "longitude": -0.124861,
    "lineIds": [
      "circle",
      "district",
      "jubilee"
    ]
  },
  {
    "id": "940GZZLUWCY",
    "name": "White City",
    "latitude": 51.511959,
    "longitude": -0.224297,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUWPL",
    "name": "Whitechapel",
    "latitude": 51.519518,
    "longitude": -0.059971,
    "lineIds": [
      "district",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUWIG",
    "name": "Willesden Green",
    "latitude": 51.549146,
    "longitude": -0.221537,
    "lineIds": [
      "jubilee",
      "metropolitan"
    ]
  },
  {
    "id": "940GZZLUWJN",
    "name": "Willesden Junction",
    "latitude": 51.532259,
    "longitude": -0.244283,
    "lineIds": [
      "bakerloo"
    ]
  },
  {
    "id": "940GZZLUWIM",
    "name": "Wimbledon",
    "latitude": 51.421207,
    "longitude": -0.206573,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUWIP",
    "name": "Wimbledon Park",
    "latitude": 51.434573,
    "longitude": -0.199719,
    "lineIds": [
      "district"
    ]
  },
  {
    "id": "940GZZLUWOG",
    "name": "Wood Green",
    "latitude": 51.597479,
    "longitude": -0.109886,
    "lineIds": [
      "piccadilly"
    ]
  },
  {
    "id": "940GZZLUWLA",
    "name": "Wood Lane",
    "latitude": 51.509669,
    "longitude": -0.22453,
    "lineIds": [
      "circle",
      "hammersmith-city"
    ]
  },
  {
    "id": "940GZZLUWOF",
    "name": "Woodford",
    "latitude": 51.606899,
    "longitude": 0.03397,
    "lineIds": [
      "central"
    ]
  },
  {
    "id": "940GZZLUWOP",
    "name": "Woodside Park",
    "latitude": 51.618014,
    "longitude": -0.18542,
    "lineIds": [
      "northern"
    ]
  }
];

export const TUBE_ROUTES: readonly TubeRoute[] = [
  {
    "id": "bakerloo-1",
    "lineId": "bakerloo",
    "stationIds": [
      "940GZZLUEAC",
      "940GZZLULBN",
      "940GZZLUWLO",
      "940GZZLUEMB",
      "940GZZLUCHX",
      "940GZZLUPCC",
      "940GZZLUOXC",
      "940GZZLURGP",
      "940GZZLUBST",
      "940GZZLUMYB",
      "940GZZLUERB",
      "940GZZLUPAC",
      "940GZZLUWKA",
      "940GZZLUMVL",
      "940GZZLUKPK",
      "940GZZLUQPS",
      "940GZZLUKSL",
      "940GZZLUWJN",
      "940GZZLUHSN",
      "940GZZLUSGP",
      "940GZZLUWYC",
      "940GZZLUNWY",
      "940GZZLUSKT",
      "940GZZLUKEN",
      "940GZZLUHAW"
    ]
  },
  {
    "id": "central-8",
    "lineId": "central",
    "stationIds": [
      "940GZZLUWRP",
      "940GZZLURSG",
      "940GZZLUSRP",
      "940GZZLUNHT",
      "940GZZLUGFD",
      "940GZZLUPVL",
      "940GZZLUHGR",
      "940GZZLUNAN"
    ]
  },
  {
    "id": "central-13",
    "lineId": "central",
    "stationIds": [
      "940GZZLUNAN",
      "940GZZLUEAN",
      "940GZZLUWCY",
      "940GZZLUSBC",
      "940GZZLUHPK",
      "940GZZLUNHG",
      "940GZZLUQWY",
      "940GZZLULGT",
      "940GZZLUMBA",
      "940GZZLUBND",
      "940GZZLUOXC",
      "940GZZLUTCR",
      "940GZZLUHBN",
      "940GZZLUCHL",
      "940GZZLUSPU",
      "940GZZLUBNK",
      "940GZZLULVT",
      "940GZZLUBLG",
      "940GZZLUMED",
      "940GZZLUSTD",
      "940GZZLULYN",
      "940GZZLULYS"
    ]
  },
  {
    "id": "central-11",
    "lineId": "central",
    "stationIds": [
      "940GZZLULYS",
      "940GZZLUSNB",
      "940GZZLUSWF",
      "940GZZLUWOF"
    ]
  },
  {
    "id": "central-10",
    "lineId": "central",
    "stationIds": [
      "940GZZLUWOF",
      "940GZZLUBKH",
      "940GZZLULGN",
      "940GZZLUDBN",
      "940GZZLUTHB",
      "940GZZLUEPG"
    ]
  },
  {
    "id": "central-12",
    "lineId": "central",
    "stationIds": [
      "940GZZLULYS",
      "940GZZLUWSD",
      "940GZZLURBG",
      "940GZZLUGTH",
      "940GZZLUNBP",
      "940GZZLUBKE",
      "940GZZLUFLP",
      "940GZZLUHLT"
    ]
  },
  {
    "id": "central-9",
    "lineId": "central",
    "stationIds": [
      "940GZZLUWOF",
      "940GZZLURVY",
      "940GZZLUCWL",
      "940GZZLUGGH",
      "940GZZLUHLT"
    ]
  },
  {
    "id": "central-7",
    "lineId": "central",
    "stationIds": [
      "940GZZLUEBY",
      "940GZZLUWTA",
      "940GZZLUNAN"
    ]
  },
  {
    "id": "circle-2",
    "lineId": "circle",
    "stationIds": [
      "940GZZLUHSC",
      "940GZZLUGHK",
      "940GZZLUSBM",
      "940GZZLUWLA",
      "940GZZLULRD",
      "940GZZLULAD",
      "940GZZLUWSP",
      "940GZZLURYO",
      "940GZZLUPAH",
      "940GZZLUERC"
    ]
  },
  {
    "id": "circle-3",
    "lineId": "circle",
    "stationIds": [
      "940GZZLUERC",
      "940GZZLUBST",
      "940GZZLUGPS",
      "940GZZLUESQ",
      "940GZZLUKSX",
      "940GZZLUFCN",
      "940GZZLUBBN",
      "940GZZLUMGT",
      "940GZZLULVT",
      "940GZZLUALD",
      "940GZZLUTWH",
      "940GZZLUMMT",
      "940GZZLUCST",
      "940GZZLUMSH",
      "940GZZLUBKF",
      "940GZZLUTMP",
      "940GZZLUEMB",
      "940GZZLUWSM",
      "940GZZLUSJP",
      "940GZZLUVIC",
      "940GZZLUSSQ",
      "940GZZLUSKS",
      "940GZZLUGTR",
      "940GZZLUHSK",
      "940GZZLUNHG",
      "940GZZLUBWT",
      "940GZZLUPAC",
      "940GZZLUERC"
    ]
  },
  {
    "id": "district-10",
    "lineId": "district",
    "stationIds": [
      "940GZZLUEBY",
      "940GZZLUECM",
      "940GZZLUACT",
      "940GZZLUCWP",
      "940GZZLUTNG"
    ]
  },
  {
    "id": "district-13",
    "lineId": "district",
    "stationIds": [
      "940GZZLUTNG",
      "940GZZLUSFB",
      "940GZZLURVP",
      "940GZZLUHSD",
      "940GZZLUBSC",
      "940GZZLUWKN",
      "940GZZLUECT"
    ]
  },
  {
    "id": "district-12",
    "lineId": "district",
    "stationIds": [
      "940GZZLUECT",
      "940GZZLUGTR",
      "940GZZLUSKS",
      "940GZZLUSSQ",
      "940GZZLUVIC",
      "940GZZLUSJP",
      "940GZZLUWSM",
      "940GZZLUEMB",
      "940GZZLUTMP",
      "940GZZLUBKF",
      "940GZZLUMSH",
      "940GZZLUCST",
      "940GZZLUMMT",
      "940GZZLUTWH",
      "940GZZLUADE",
      "940GZZLUWPL",
      "940GZZLUSGN",
      "940GZZLUMED",
      "940GZZLUBWR",
      "940GZZLUBBB",
      "940GZZLUWHM",
      "940GZZLUPLW",
      "940GZZLUUPK",
      "940GZZLUEHM",
      "940GZZLUBKG",
      "940GZZLUUPY",
      "940GZZLUBEC",
      "940GZZLUDGY",
      "940GZZLUDGE",
      "940GZZLUEPK",
      "940GZZLUHCH",
      "940GZZLUUPB",
      "940GZZLUUPM"
    ]
  },
  {
    "id": "district-8",
    "lineId": "district",
    "stationIds": [
      "940GZZLURMD",
      "940GZZLUKWG",
      "940GZZLUGBY",
      "940GZZLUTNG"
    ]
  },
  {
    "id": "district-9",
    "lineId": "district",
    "stationIds": [
      "940GZZLUWIM",
      "940GZZLUWIP",
      "940GZZLUSFS",
      "940GZZLUEPY",
      "940GZZLUPYB",
      "940GZZLUPSG",
      "940GZZLUFBY",
      "940GZZLUWBN",
      "940GZZLUECT"
    ]
  },
  {
    "id": "district-11",
    "lineId": "district",
    "stationIds": [
      "940GZZLUECT",
      "940GZZLUHSK",
      "940GZZLUNHG",
      "940GZZLUBWT",
      "940GZZLUPAC",
      "940GZZLUERC"
    ]
  },
  {
    "id": "district-7",
    "lineId": "district",
    "stationIds": [
      "940GZZLUKOY",
      "940GZZLUECT"
    ]
  },
  {
    "id": "hammersmith-city-1",
    "lineId": "hammersmith-city",
    "stationIds": [
      "940GZZLUHSC",
      "940GZZLUGHK",
      "940GZZLUSBM",
      "940GZZLUWLA",
      "940GZZLULRD",
      "940GZZLULAD",
      "940GZZLUWSP",
      "940GZZLURYO",
      "940GZZLUPAH",
      "940GZZLUERC",
      "940GZZLUBST",
      "940GZZLUGPS",
      "940GZZLUESQ",
      "940GZZLUKSX",
      "940GZZLUFCN",
      "940GZZLUBBN",
      "940GZZLUMGT",
      "940GZZLULVT",
      "940GZZLUADE",
      "940GZZLUWPL",
      "940GZZLUSGN",
      "940GZZLUMED",
      "940GZZLUBWR",
      "940GZZLUBBB",
      "940GZZLUWHM",
      "940GZZLUPLW",
      "940GZZLUUPK",
      "940GZZLUEHM",
      "940GZZLUBKG"
    ]
  },
  {
    "id": "jubilee-1",
    "lineId": "jubilee",
    "stationIds": [
      "940GZZLUSTM",
      "940GZZLUCPK",
      "940GZZLUQBY",
      "940GZZLUKBY",
      "940GZZLUWYP",
      "940GZZLUNDN",
      "940GZZLUDOH",
      "940GZZLUWIG",
      "940GZZLUKBN",
      "940GZZLUWHP",
      "940GZZLUFYR",
      "940GZZLUSWC",
      "940GZZLUSJW",
      "940GZZLUBST",
      "940GZZLUBND",
      "940GZZLUGPK",
      "940GZZLUWSM",
      "940GZZLUWLO",
      "940GZZLUSWK",
      "940GZZLULNB",
      "940GZZLUBMY",
      "940GZZLUCWR",
      "940GZZLUCYF",
      "940GZZLUNGW",
      "940GZZLUCGT",
      "940GZZLUWHM",
      "940GZZLUSTD"
    ]
  },
  {
    "id": "metropolitan-8",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUAMS",
      "940GZZLUCAL"
    ]
  },
  {
    "id": "metropolitan-17",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUCAL",
      "940GZZLUCYD",
      "940GZZLURKW",
      "940GZZLUMPK"
    ]
  },
  {
    "id": "metropolitan-15",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUMPK",
      "940GZZLUNOW",
      "940GZZLUNWH",
      "940GZZLUPNR",
      "940GZZLUNHA",
      "940GZZLUHOH"
    ]
  },
  {
    "id": "metropolitan-11",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUHOH",
      "940GZZLUNKP",
      "940GZZLUPRD",
      "940GZZLUWYP"
    ]
  },
  {
    "id": "metropolitan-16",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUFYR",
      "940GZZLUBST",
      "940GZZLUGPS",
      "940GZZLUESQ",
      "940GZZLUKSX",
      "940GZZLUFCN",
      "940GZZLUBBN",
      "940GZZLUMGT",
      "940GZZLULVT",
      "940GZZLUALD"
    ]
  },
  {
    "id": "metropolitan-14",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUWYP",
      "940GZZLUWIG",
      "940GZZLUFYR"
    ]
  },
  {
    "id": "metropolitan-13",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUWYP",
      "940GZZLUFYR"
    ]
  },
  {
    "id": "metropolitan-10",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUCSM",
      "940GZZLUCAL"
    ]
  },
  {
    "id": "metropolitan-9",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUUXB",
      "940GZZLUHGD",
      "940GZZLUICK",
      "940GZZLURSP",
      "940GZZLURSM",
      "940GZZLUEAE",
      "940GZZLURYL",
      "940GZZLUWHW",
      "940GZZLUHOH"
    ]
  },
  {
    "id": "metropolitan-7",
    "lineId": "metropolitan",
    "stationIds": [
      "940GZZLUWAF",
      "940GZZLUCXY",
      "940GZZLUMPK"
    ]
  },
  {
    "id": "northern-11",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUMDN",
      "940GZZLUSWN",
      "940GZZLUCSD",
      "940GZZLUTBY",
      "940GZZLUTBC",
      "940GZZLUBLM",
      "940GZZLUCPS",
      "940GZZLUCPC",
      "940GZZLUCPN",
      "940GZZLUSKW",
      "940GZZLUOVL",
      "940GZZLUKNG"
    ]
  },
  {
    "id": "northern-12",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUKNG",
      "940GZZLUWLO",
      "940GZZLUEMB",
      "940GZZLUCHX",
      "940GZZLULSQ",
      "940GZZLUTCR",
      "940GZZLUGDG",
      "940GZZLUWRR",
      "940GZZLUEUS"
    ]
  },
  {
    "id": "northern-14",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUEUS",
      "940GZZLUMTC",
      "940GZZLUCTN"
    ]
  },
  {
    "id": "northern-17",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUCTN",
      "940GZZLUKSH",
      "940GZZLUTFP",
      "940GZZLUACY",
      "940GZZLUHGT",
      "940GZZLUEFY",
      "940GZZLUFYC"
    ]
  },
  {
    "id": "northern-18",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUFYC",
      "940GZZLUWFN",
      "940GZZLUWOP",
      "940GZZLUTAW",
      "940GZZLUHBT"
    ]
  },
  {
    "id": "northern-13",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUKNG",
      "940GZZLUEAC",
      "940GZZLUBOR",
      "940GZZLULNB",
      "940GZZLUBNK",
      "940GZZLUMGT",
      "940GZZLUODS",
      "940GZZLUAGL",
      "940GZZLUKSX",
      "940GZZLUEUS"
    ]
  },
  {
    "id": "northern-15",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUEUS",
      "940GZZLUCTN"
    ]
  },
  {
    "id": "northern-16",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUCTN",
      "940GZZLUCFM",
      "940GZZLUBZP",
      "940GZZLUHTD",
      "940GZZLUGGN",
      "940GZZLUBTX",
      "940GZZLUHCL",
      "940GZZLUCND",
      "940GZZLUBTK",
      "940GZZLUEGW"
    ]
  },
  {
    "id": "northern-19",
    "lineId": "northern",
    "stationIds": [
      "940GZZLUFYC",
      "940GZZLUMHL"
    ]
  },
  {
    "id": "northern-10",
    "lineId": "northern",
    "stationIds": [
      "940GZZBPSUST",
      "940GZZNEUGST",
      "940GZZLUKNG"
    ]
  },
  {
    "id": "piccadilly-5",
    "lineId": "piccadilly",
    "stationIds": [
      "940GZZLUUXB",
      "940GZZLUHGD",
      "940GZZLUICK",
      "940GZZLURSP",
      "940GZZLURSM",
      "940GZZLUEAE",
      "940GZZLURYL",
      "940GZZLUSHH",
      "940GZZLUSUH",
      "940GZZLUSUT",
      "940GZZLUALP",
      "940GZZLUPKR",
      "940GZZLUNEN",
      "940GZZLUECM",
      "940GZZLUACT"
    ]
  },
  {
    "id": "piccadilly-8",
    "lineId": "piccadilly",
    "stationIds": [
      "940GZZLUACT",
      "940GZZLUTNG",
      "940GZZLUHSD",
      "940GZZLUBSC",
      "940GZZLUECT",
      "940GZZLUGTR",
      "940GZZLUSKS",
      "940GZZLUKNB",
      "940GZZLUHPC",
      "940GZZLUGPK",
      "940GZZLUPCC",
      "940GZZLULSQ",
      "940GZZLUCGN",
      "940GZZLUHBN",
      "940GZZLURSQ",
      "940GZZLUKSX",
      "940GZZLUCAR",
      "940GZZLUHWY",
      "940GZZLUASL",
      "940GZZLUFPK",
      "940GZZLUMRH",
      "940GZZLUTPN",
      "940GZZLUWOG",
      "940GZZLUBDS",
      "940GZZLUASG",
      "940GZZLUSGT",
      "940GZZLUOAK",
      "940GZZLUCKS"
    ]
  },
  {
    "id": "piccadilly-6",
    "lineId": "piccadilly",
    "stationIds": [
      "940GZZLUHR4",
      "940GZZLUHRC"
    ]
  },
  {
    "id": "piccadilly-9",
    "lineId": "piccadilly",
    "stationIds": [
      "940GZZLUHRC",
      "940GZZLUHNX",
      "940GZZLUHWT",
      "940GZZLUHWC",
      "940GZZLUHWE",
      "940GZZLUOSY",
      "940GZZLUBOS",
      "940GZZLUNFD",
      "940GZZLUSEA",
      "940GZZLUACT"
    ]
  },
  {
    "id": "piccadilly-7",
    "lineId": "piccadilly",
    "stationIds": [
      "940GZZLUHR5",
      "940GZZLUHRC"
    ]
  },
  {
    "id": "victoria-1",
    "lineId": "victoria",
    "stationIds": [
      "940GZZLUBXN",
      "940GZZLUSKW",
      "940GZZLUVXL",
      "940GZZLUPCO",
      "940GZZLUVIC",
      "940GZZLUGPK",
      "940GZZLUOXC",
      "940GZZLUWRR",
      "940GZZLUEUS",
      "940GZZLUKSX",
      "940GZZLUHAI",
      "940GZZLUFPK",
      "940GZZLUSVS",
      "940GZZLUTMH",
      "940GZZLUBLR",
      "940GZZLUWWL"
    ]
  },
  {
    "id": "waterloo-city-1",
    "lineId": "waterloo-city",
    "stationIds": [
      "940GZZLUWLO",
      "940GZZLUBNK"
    ]
  }
];
