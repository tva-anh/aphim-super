/**
 * Partner DT99 – Firebase Firestore Session Tracker
 * Dùng Firestore REST API (không cần SDK)
 * Cross-device, cross-browser — lưu trên cloud
 */
(function(w){
  'use strict';

  var _PROJECT  = 'chat-a-phim';
  var _API_KEY  = 'AIzaSyBAcSx1rRMC79-yUz6XINMZOeYuKlNWA00';
  var _BASE     = 'https://firestore.googleapis.com/v1/projects/' + _PROJECT + '/databases/(default)/documents';
  var _COL      = 'partner_dt99';

  /** Encode JS object → Firestore fields map */
  function _enc(obj) {
    var fields = {};
    Object.keys(obj).forEach(function(k) {
      var v = obj[k];
      if (v === null || v === undefined) {
        fields[k] = { nullValue: null };
      } else if (typeof v === 'number') {
        if (Number.isInteger(v)) fields[k] = { integerValue: String(v) };
        else                     fields[k] = { doubleValue: v };
      } else if (typeof v === 'boolean') {
        fields[k] = { booleanValue: v };
      } else {
        fields[k] = { stringValue: String(v) };
      }
    });
    return { fields: fields };
  }

  /** Decode Firestore fields map → JS object */
  function _dec(fields) {
    if (!fields) return {};
    var obj = {};
    Object.keys(fields).forEach(function(k) {
      var f = fields[k];
      if      ('stringValue'  in f) obj[k] = f.stringValue;
      else if ('integerValue' in f) obj[k] = parseInt(f.integerValue, 10);
      else if ('doubleValue'  in f) obj[k] = f.doubleValue;
      else if ('booleanValue' in f) obj[k] = f.booleanValue;
      else                          obj[k] = null;
    });
    return obj;
  }

  /**
   * Ghi 1 session document vào Firestore.
   * Dùng timestamp làm document ID để tự sort.
   * @param {object} data - session data
   */
  function writeSession(data) {
    var docId = String(data.t || Date.now());
    var url = _BASE + '/' + _COL + '/' + docId + '?key=' + _API_KEY;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_enc(data))
    }).catch(function() {});
  }

  /**
   * Đọc 50 sessions gần nhất (sắp xếp theo t DESC).
   * Dùng Firestore runQuery để orderBy + limit.
   * @returns {Promise<Array>} mảng session objects
   */
  function readSessions() {
    var url = _BASE + ':runQuery?key=' + _API_KEY;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: _COL }],
          orderBy: [{ field: { fieldPath: 't' }, direction: 'DESCENDING' }],
          limit: 50
        }
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(results) {
      if (!Array.isArray(results)) return [];
      return results
        .filter(function(r) { return r.document && r.document.fields; })
        .map(function(r) { return _dec(r.document.fields); });
    });
  }

  /**
   * Xóa tất cả sessions: đọc danh sách rồi DELETE từng document.
   * @returns {Promise}
   */
  function clearSessions() {
    return readSessions().then(function(sessions) {
      var promises = sessions.map(function(s) {
        var docId = String(s.t);
        var url = _BASE + '/' + _COL + '/' + docId + '?key=' + _API_KEY;
        return fetch(url, { method: 'DELETE' }).catch(function(){});
      });
      return Promise.all(promises);
    });
  }
  /**
   * Đọc/Ghi config thống nhất
   */
  function readConfig() {
    var url = _BASE + '/' + _COL + '/config?key=' + _API_KEY;
    return fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(doc){
        if(!doc || !doc.fields) return null;
        return _dec(doc.fields);
      })
      .catch(function(){ return null; });
  }

  function writeConfig(cfg) {
    var url = _BASE + '/' + _COL + '/config?key=' + _API_KEY;
    return fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_enc(cfg))
    });
  }
  // Expose public API
  w.PartnerFB = {
    writeSession: writeSession,
    readSessions: readSessions,
    clearSessions: clearSessions,
    readConfig: readConfig,
    writeConfig: writeConfig
  };

})(window);
