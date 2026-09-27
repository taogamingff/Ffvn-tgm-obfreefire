const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(process.cwd(), "data", "ob.json");

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

function headers() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60"
  };
}

function normalizeOB(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const raw = String(value).trim().toUpperCase();

  const match = /^(?:OB)?(\d+)$/.exec(raw);

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (!Number.isSafeInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function normalizeServer(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return String(value).trim().toLowerCase();
}

function validDateParts(date, time) {
  if (!date || !time) return false;

  return (
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}(?::\d{2})?$/.test(time)
  );
}

function getOffsetMilliseconds(timestamp, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(timestamp));

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  const localTimestamp = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return localTimestamp - timestamp;
}

function toTimestamp(date, time, timezone) {
  if (!validDateParts(date, time)) {
    return null;
  }

  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  const timeMatch =
    /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);

  let timestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  );

  for (let i = 0; i < 4; i++) {
    const offset = getOffsetMilliseconds(
      timestamp,
      timezone
    );

    const desiredLocal = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      second
    );

    timestamp = desiredLocal - offset;
  }

  return timestamp;
}

function isoWithTimezone(timestamp, timezone) {
  if (timestamp === null) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(timestamp));

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  let offset = values.timeZoneName || "GMT+00:00";

  if (offset === "GMT") {
    offset = "GMT+00:00";
  }

  offset = offset.replace("GMT", "");

  if (/^[+-]\d$/.test(offset)) {
    offset += ":00";
  }

  if (/^[+-]\d{2}$/.test(offset)) {
    offset += ":00";
  }

  return (
    `${values.year}-${values.month}-${values.day}` +
    `T${values.hour}:${values.minute}:${values.second}` +
    offset
  );
}

function formatLocal(timestamp, timezone) {
  if (timestamp === null) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(timestamp));

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    date_display:
      `${values.day}/${values.month}/${values.year}`,
    time:
      `${values.hour}:${values.minute}:${values.second}`
  };
}

function countdown(targetTimestamp) {
  if (targetTimestamp === null) {
    return null;
  }

  const diff = targetTimestamp - Date.now();

  if (diff <= 0) {
    return {
      total_seconds: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      expired: true,
      label: "ĐÃ ĐẾN THỜI GIAN DỰ KIẾN"
    };
  }

  const totalSeconds = Math.floor(diff / 1000);

  const days = Math.floor(totalSeconds / 86400);

  const hours = Math.floor(
    (totalSeconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  return {
    total_seconds: totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    expired: false,
    label:
      `${days} ngày ${hours} giờ ` +
      `${minutes} phút ${seconds} giây`
  };
}

function findRecord(records, ob) {
  return records.find(
    record => Number(record.ob) === Number(ob)
  ) || null;
}

function validRecordTimestamp(record, timezone) {
  if (!record) return null;

  return toTimestamp(
    record.release_date,
    record.release_time,
    timezone
  );
}

function getIntervals(records, timezone) {
  const sorted = records
    .filter(record =>
      validRecordTimestamp(record, timezone) !== null
    )
    .sort((a, b) => Number(a.ob) - Number(b.ob));

  const intervals = [];

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];

    const previousTime =
      validRecordTimestamp(previous, timezone);

    const currentTime =
      validRecordTimestamp(current, timezone);

    const obDifference =
      Number(current.ob) - Number(previous.ob);

    if (
      previousTime !== null &&
      currentTime !== null &&
      obDifference > 0 &&
      currentTime > previousTime
    ) {
      const days =
        (currentTime - previousTime) / 86400000;

      intervals.push({
        from_ob: Number(previous.ob),
        to_ob: Number(current.ob),
        days,
        days_per_ob: days / obDifference
      });
    }
  }

  return intervals;
}

function average(values) {
  if (!values.length) return null;

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function makeServerPrediction(server, requestedOB) {
  const records = Array.isArray(server.records)
    ? server.records
    : [];

  const currentRecord =
    findRecord(records, requestedOB);

  if (!currentRecord) {
    return {
      code: server.code,
      name: server.name,
      timezone: server.timezone,
      current_ob: requestedOB,
      next_ob: requestedOB + 1,
      status: "UNKNOWN",
      status_label: "CHƯA CÓ DỮ LIỆU",
      prediction: null,
      countdown: null,
      interval: null,
      historical: {
        previous_ob: null,
        previous_to_current_days: null,
        average_cycle_days: null,
        samples: 0
      },
      source: "configured historical data",
      notes: "Không tìm thấy OB này trong dữ liệu cấu hình."
    };
  }

  const nextOB = requestedOB + 1;

  const currentTimestamp =
    validRecordTimestamp(
      currentRecord,
      server.timezone
    );

  if (currentTimestamp === null) {
    return {
      code: server.code,
      name: server.name,
      timezone: server.timezone,
      current_ob: requestedOB,
      next_ob: nextOB,
      status: "UNKNOWN",
      status_label: "CHƯA CÓ DỮ LIỆU",
      prediction: null,
      countdown: null,
      interval: null,
      historical: {
        previous_ob: currentRecord.previous_ob ?? null,
        previous_to_current_days: null,
        average_cycle_days: null,
        samples: 0
      },
      source: currentRecord.source || "configured-data",
      notes:
        "OB hiện tại chưa có ngày/giờ hợp lệ."
    };
  }

  const nextRecord =
    findRecord(records, nextOB);

  const nextTimestamp =
    validRecordTimestamp(
      nextRecord,
      server.timezone
    );

  const intervals =
    getIntervals(records, server.timezone);

  const averageCycle =
    average(
      intervals.map(item => item.days_per_ob)
    );

  let previousRecord = null;

  for (const record of records) {
    if (
      Number(record.ob) < requestedOB &&
      validRecordTimestamp(record, server.timezone) !== null
    ) {
      if (
        !previousRecord ||
        Number(record.ob) >
          Number(previousRecord.ob)
      ) {
        previousRecord = record;
      }
    }
  }

  let previousToCurrentDays = null;

  if (previousRecord) {
    const previousTimestamp =
      validRecordTimestamp(
        previousRecord,
        server.timezone
      );

    if (previousTimestamp !== null) {
      previousToCurrentDays =
        (currentTimestamp - previousTimestamp) /
        86400000;
    }
  }

  if (nextRecord && nextTimestamp !== null) {
    const local =
      formatLocal(
        nextTimestamp,
        server.timezone
      );

    return {
      code: server.code,
      name: server.name,
      timezone: server.timezone,
      current_ob: requestedOB,
      next_ob: nextOB,
      status: "CONFIRMED",
      status_label: "ĐÃ XÁC NHẬN",
      prediction: {
        status: "CONFIRMED",
        date: local.date,
        date_display: local.date_display,
        time: local.time,
        timezone: server.timezone,
        datetime:
          isoWithTimezone(
            nextTimestamp,
            server.timezone
          ),
        unix_timestamp:
          Math.floor(nextTimestamp / 1000),
        source:
          nextRecord.source ||
          "configured-data"
      },
      countdown:
        countdown(nextTimestamp),
      interval: {
        days:
          (nextTimestamp - currentTimestamp) /
          86400000,
        label:
          `${Math.round(
            (nextTimestamp - currentTimestamp) /
            86400000
          )} ngày`
      },
      historical: {
        previous_ob:
          previousRecord
            ? Number(previousRecord.ob)
            : currentRecord.previous_ob ?? null,
        previous_to_current_days:
          previousToCurrentDays === null
            ? null
            : Number(
                previousToCurrentDays.toFixed(3)
              ),
        average_cycle_days:
          averageCycle === null
            ? null
            : Number(
                averageCycle.toFixed(3)
              ),
        samples: intervals.length
      },
      source:
        nextRecord.source ||
        "configured historical data",
      notes: nextRecord.notes || ""
    };
  }

  if (averageCycle !== null && averageCycle > 0) {
    const predictedTimestamp =
      currentTimestamp +
      averageCycle * 86400000;

    const local =
      formatLocal(
        predictedTimestamp,
        server.timezone
      );

    return {
      code: server.code,
      name: server.name,
      timezone: server.timezone,
      current_ob: requestedOB,
      next_ob: nextOB,
      status: "PREDICTED",
      status_label: "DỰ ĐOÁN",
      prediction: {
        status: "PREDICTED",
        date: local.date,
        date_display: local.date_display,
        time: local.time,
        timezone: server.timezone,
        datetime:
          isoWithTimezone(
            predictedTimestamp,
            server.timezone
          ),
        unix_timestamp:
          Math.floor(
            predictedTimestamp / 1000
          ),
        source:
          "calculated from configured historical data"
      },
      countdown:
        countdown(predictedTimestamp),
      interval: {
        days: averageCycle,
        label:
          `${Number(
            averageCycle.toFixed(2)
          )} ngày/OB`
      },
      historical: {
        previous_ob:
          previousRecord
            ? Number(previousRecord.ob)
            : currentRecord.previous_ob ?? null,
        previous_to_current_days:
          previousToCurrentDays === null
            ? null
            : Number(
                previousToCurrentDays.toFixed(3)
              ),
        average_cycle_days:
          Number(
            averageCycle.toFixed(3)
          ),
        samples: intervals.length
      },
      source:
        "configured historical data",
      notes:
        "Đây là thời gian dự đoán được tính từ dữ liệu lịch sử, không phải lịch chính thức."
    };
  }

  return {
    code: server.code,
    name: server.name,
    timezone: server.timezone,
    current_ob: requestedOB,
    next_ob: nextOB,
    status: "UNKNOWN",
    status_label: "CHƯA CÓ DỮ LIỆU",
    prediction: null,
    countdown: null,
    interval: null,
    historical: {
      previous_ob:
        previousRecord
          ? Number(previousRecord.ob)
          : currentRecord.previous_ob ?? null,
      previous_to_current_days:
        previousToCurrentDays === null
          ? null
          : Number(
              previousToCurrentDays.toFixed(3)
            ),
      average_cycle_days: null,
      samples: intervals.length
    },
    source:
      "configured historical data",
    notes:
      "Chưa đủ dữ liệu lịch sử để tính dự đoán."
  };
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    return res.status(204).set(headers()).end();
  }

  if (req.method !== "GET") {
    return res.status(405).set(headers()).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      message: "Chỉ hỗ trợ GET."
    });
  }

  const requestedOB =
    normalizeOB(req.query.ob);

  if (requestedOB === null) {
    if (
      req.query.ob === undefined ||
      req.query.ob === null ||
      String(req.query.ob).trim() === ""
    ) {
      return res.status(400).set(headers()).json({
        success: false,
        error: "MISSING_OB",
        message: "Vui lòng nhập số OB."
      });
    }

    return res.status(400).set(headers()).json({
      success: false,
      error: "INVALID_OB",
      message: "OB không hợp lệ."
    });
  }

  const requestedServer =
    normalizeServer(req.query.server);

  try {
    const data = loadData();

    let servers = Object.values(data.servers);

    if (requestedServer) {
      const selected =
        data.servers[requestedServer];

      if (!selected) {
        return res.status(404).set(headers()).json({
          success: false,
          error: "SERVER_NOT_FOUND",
          message:
            "Không tìm thấy server được yêu cầu.",
          available_servers:
            Object.keys(data.servers)
        });
      }

      servers = [selected];
    }

    const results = servers.map(server =>
      makeServerPrediction(
        server,
        requestedOB
      )
    );

    const hasAnyData =
      results.some(
        result =>
          result.status === "CONFIRMED" ||
          result.status === "PREDICTED"
      );

    const hasCurrentOB =
      results.some(
        result =>
          result.status !== "UNKNOWN" ||
          result.historical?.previous_ob !== null
      );

    if (!hasAnyData && !hasCurrentOB) {
      return res.status(404).set(headers()).json({
        success: false,
        error: "OB_NOT_FOUND",
        message:
          "Chưa có dữ liệu cho OB này.",
        query: {
          ob: requestedOB,
          server: requestedServer
        },
        data: {
          source: "configured historical data",
          last_updated:
            data.last_updated || null
        }
      });
    }

    const first = results[0];

    return res.status(200).set(headers()).json({
      success: true,
      type: "ob_prediction",
      query: {
        ob: requestedOB,
        server: requestedServer
      },
      current_ob: requestedOB,
      next_ob: requestedOB + 1,
      prediction: requestedServer
        ? first.prediction
        : null,
      countdown: requestedServer
        ? first.countdown
        : null,
      servers: results,
      data: {
        source:
          "configured historical data",
        last_updated:
          data.last_updated || null,
        generated_at:
          new Date().toISOString(),
        official:
          false,
        disclaimer:
          "Dữ liệu dự đoán dựa trên lịch sử được cấu hình. Không phải dữ liệu chính thức của Garena nếu không có nguồn chính thức xác nhận."
      }
    });
  } catch (error) {
    return res.status(500).set(headers()).json({
      success: false,
      error: "INTERNAL_ERROR",
      message:
        "Không thể xử lý dữ liệu OB.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
};
