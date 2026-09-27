// ============================================================
// FFVN.TGM - FREE FIRE OB API
// Vercel Serverless Function
//
// GET:
// /api/ob
// /api/ob?ob=55
// /api/ob?ob=OB55
// /api/ob?ob=100
// /api/ob?servers=true
// /api/ob?all=true
//
// Không phải API chính thức của Garena.
// ============================================================

const OB_DATABASE = [
  {
    ob: 49,
    date: "2025-05-21",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 50,
    date: "2025-07-30",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 51,
    date: "2025-10-29",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 52,
    date: "2026-01-14",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 53,
    date: "2026-04-08",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 54,
    date: "2026-06-24",
    confirmed: true,
    source: "Garena Free Fire"
  },
  {
    ob: 55,
    date: "2026-09-10",
    confirmed: true,
    source: "Garena Free Fire"
  }

  // ==========================================================
  // CHỈ thêm OB56 / OB57 vào đây khi bạn có nguồn xác nhận.
  //
  // Ví dụ:
  //
  // {
  //   ob: 56,
  //   date: "2026-12-16",
  //   confirmed: true,
  //   source: "Nguồn xác nhận"
  // }
  //
  // ==========================================================
];


// ============================================================
// SERVER DATABASE
// ============================================================

const SERVERS = [
  {
    id: "vn",
    icon: "🇻🇳",
    name: "Việt Nam",
    timezone: "Asia/Ho_Chi_Minh",
    offset: "UTC+07:00"
  },
  {
    id: "id",
    icon: "🇮🇩",
    name: "Indonesia",
    timezone: "Asia/Jakarta",
    offset: "UTC+07:00"
  },
  {
    id: "th",
    icon: "🇹🇭",
    name: "Thailand",
    timezone: "Asia/Bangkok",
    offset: "UTC+07:00"
  },
  {
    id: "sg",
    icon: "🇸🇬",
    name: "Singapore",
    timezone: "Asia/Singapore",
    offset: "UTC+08:00"
  },
  {
    id: "my",
    icon: "🇲🇾",
    name: "Malaysia",
    timezone: "Asia/Kuala_Lumpur",
    offset: "UTC+08:00"
  },
  {
    id: "ph",
    icon: "🇵🇭",
    name: "Philippines",
    timezone: "Asia/Manila",
    offset: "UTC+08:00"
  },
  {
    id: "in",
    icon: "🇮🇳",
    name: "India",
    timezone: "Asia/Kolkata",
    offset: "UTC+05:30"
  },
  {
    id: "br",
    icon: "🇧🇷",
    name: "Brazil",
    timezone: "America/Sao_Paulo",
    offset: "UTC-03:00"
  },
  {
    id: "us",
    icon: "🇺🇸",
    name: "North America",
    timezone: "America/New_York",
    offset: "UTC-05:00 / UTC-04:00"
  },
  {
    id: "eu",
    icon: "🇪🇺",
    name: "Europe",
    timezone: "Europe/Berlin",
    offset: "UTC+01:00 / UTC+02:00"
  },
  {
    id: "me",
    icon: "🌍",
    name: "Middle East",
    timezone: "Asia/Riyadh",
    offset: "UTC+03:00"
  },
  {
    id: "pk",
    icon: "🇵🇰",
    name: "Pakistan",
    timezone: "Asia/Karachi",
    offset: "UTC+05:00"
  ],
};


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateString, locale = "vi-VN") {

  const date = new Date(dateString + "T00:00:00Z");

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "long"
  }).format(date);
}


// ============================================================
// NORMALIZE OB
// ============================================================

function normalizeOB(value) {

  if (
    value === undefined ||
    value === null ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const cleaned = String(value)
    .trim()
    .toUpperCase()
    .replace(/^OB/, "")
    .replace(/[^0-9]/g, "");

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  if (!Number.isInteger(number)) {
    return null;
  }

  if (number < 1 || number > 999) {
    return null;
  }

  return number;
}


// ============================================================
// DATE DIFFERENCE
// ============================================================

function daysBetween(a, b) {

  const first =
    new Date(a + "T00:00:00Z").getTime();

  const second =
    new Date(b + "T00:00:00Z").getTime();

  return Math.round(
    (second - first) /
    86400000
  );
}


// ============================================================
// ADD DAYS
// ============================================================

function addDays(dateString, days) {

  const date =
    new Date(dateString + "T00:00:00Z");

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return date
    .toISOString()
    .slice(0, 10);
}


// ============================================================
// CALCULATE AVERAGE
// ============================================================

function calculateAverageInterval(data) {

  if (data.length < 2) {
    return null;
  }

  const sorted =
    [...data].sort(
      (a, b) => a.ob - b.ob
    );

  const intervals = [];

  for (let i = 1; i < sorted.length; i++) {

    const diff =
      daysBetween(
        sorted[i - 1].date,
        sorted[i].date
      );

    if (diff > 0) {
      intervals.push(diff);
    }
  }

  if (!intervals.length) {
    return null;
  }

  const total =
    intervals.reduce(
      (sum, value) => sum + value,
      0
    );

  return Math.round(
    total / intervals.length
  );
}


// ============================================================
// PREDICT
// ============================================================

function predictOB(obNumber) {

  const sorted =
    [...OB_DATABASE]
      .filter(item => item.ob < obNumber)
      .sort((a, b) => a.ob - b.ob);

  if (sorted.length < 2) {

    return {
      success: false,
      error:
        "Không đủ dữ liệu lịch sử để dự đoán OB này."
    };

  }

  const last =
    sorted[sorted.length - 1];

  const average =
    calculateAverageInterval(sorted);

  if (!average) {

    return {
      success: false,
      error:
        "Không thể tính khoảng thời gian OB."
    };

  }

  const step =
    obNumber - last.ob;

  const predictedDays =
    Math.round(
      average * step
    );

  const predictedDate =
    addDays(
      last.date,
      predictedDays
    );

  return {
    success: true,
    type: "prediction",
    ob: `OB${obNumber}`,
    date: predictedDate,
    displayDate:
      formatDate(
        predictedDate,
        "vi-VN"
      ),
    confirmed: false,
    accuracy:
      "DỰ ĐOÁN - KHÔNG PHẢI XÁC NHẬN CHÍNH THỨC",
    averageIntervalDays: average,
    basedOn: sorted.map(item => ({
      ob: `OB${item.ob}`,
      date: item.date
    }))
  };
}


// ============================================================
// SERVER TIME
// ============================================================

function getServerTimes(dateString) {

  if (!dateString) {
    return [];
  }

  const utcDate =
    new Date(
      dateString + "T00:00:00Z"
    );

  return SERVERS.map(server => {

    let time = null;

    try {

      time =
        new Intl.DateTimeFormat(
          "en-GB",
          {
            timeZone:
              server.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }
        ).format(utcDate);

    } catch (_) {

      time = null;

    }

    return {
      ...server,
      updateDateUTC: dateString,
      localTime: time
    };

  });
}


// ============================================================
// MAIN HANDLER
// ============================================================

export default function handler(req, res) {

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=60"
  );


  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }


  if (req.method !== "GET") {

    return res.status(405).json({
      success: false,
      error: "Method Not Allowed"
    });

  }


  // ==========================================================
  // SERVERS
  // ==========================================================

  if (
    String(req.query.servers)
      .toLowerCase() === "true"
  ) {

    return res.status(200).json({
      success: true,
      type: "servers",
      total: SERVERS.length,
      data: SERVERS
    });

  }


  // ==========================================================
  // ALL
  // ==========================================================

  if (
    String(req.query.all)
      .toLowerCase() === "true"
  ) {

    return res.status(200).json({

      success: true,

      api:
        "FFVN.TGM Free Fire OB API",

      official:
        false,

      notice:
        "API cộng đồng. Không phải API chính thức của Garena.",

      total:
        OB_DATABASE.length,

      data:
        OB_DATABASE.map(item => ({
          ...item,
          ob: `OB${item.ob}`,
          displayDate:
            formatDate(
              item.date,
              "vi-VN"
            )
        }))

    });

  }


  // ==========================================================
  // OB
  // ==========================================================

  const obNumber =
    normalizeOB(
      req.query.ob
    );


  // Không nhập OB
  if (!obNumber) {

    return res.status(200).json({

      success: true,

      api:
        "FFVN.TGM Free Fire OB API",

      usage: {

        example1:
          "/api/ob?ob=55",

        example2:
          "/api/ob?ob=OB55",

        example3:
          "/api/ob?ob=100",

        all:
          "/api/ob?all=true",

        servers:
          "/api/ob?servers=true"

      },

      notice:
        "Nhập OB để tra cứu hoặc dự đoán."

    });

  }


  // ==========================================================
  // CHECK KNOWN OB
  // ==========================================================

  const known =
    OB_DATABASE.find(
      item =>
        item.ob === obNumber
    );


  if (known) {

    return res.status(200).json({

      success: true,

      type: "confirmed",

      ob:
        `OB${known.ob}`,

      date:
        known.date,

      displayDate:
        formatDate(
          known.date,
          "vi-VN"
        ),

      confirmed:
        known.confirmed,

      source:
        known.source,

      accuracy:
        known.confirmed
          ? "ĐÃ CÓ DỮ LIỆU XÁC NHẬN"
          : "DỮ LIỆU CẤU HÌNH",

      servers:
        getServerTimes(
          known.date
        )

    });

  }


  // ==========================================================
  // PREDICTION
  // ==========================================================

  const prediction =
    predictOB(
      obNumber
    );


  if (!prediction.success) {

    return res.status(400).json(
      prediction
    );

  }


  return res.status(200).json({

    ...prediction,

    servers:
      getServerTimes(
        prediction.date
      ),

    notice:
      "Ngày này là kết quả tính toán từ dữ liệu lịch sử, không phải ngày được Garena xác nhận."

  });

  }
