var Battery = (function (window, document, undefined) {

  var PREFIX = "BTRY";

  var Store = (function () {
    var name = "__s";
    var store = window.localStorage;
    var virtualStore = {
      setItem: noop,
      getItem: noop,
      removeItem: noop,
      virtual: true
    };

    if (store) {
      try {
        store.setItem(name, "");
        store.removeItem(name);
        return store;
      } catch (e) {
        return virtualStore;
      }
    } else {
      return virtualStore;
    }
  })();

  function noop() {}

  function clearStore(prefix) {
    if (!Store.virtual) {
      for (var key in Store) {
        if (0 === key.indexOf(prefix)) {
          Store.removeItem(key);
        }
      }
    }
  }

  function loadScript(src, cb) {
    var tag = "script";
    var firstScript;
    var el;
    cb = cb || noop;
    el = document.createElement(tag);
    firstScript = document.getElementsByTagName(tag)[0];
    el.async = 1;
    el.src = src;
    el.onload = function () {
      cb();
    };
    el.onerror = function () {
      cb(new Error("failed to load: " + src));
    };
    firstScript.parentNode.insertBefore(el, firstScript);
  }

  // 执行代码片段
  function execCode(code, callback) {
    new Function("!" + code + "()")();
    callback && setTimeout(callback, 0);
  }

  function Battery() {
    this.noCache = this.loadRemote = false;
    this.uri = this.key = "";
    this.callbacks = [];
  }

  Battery.prototype = {
    constructor: Battery,
    init: function init(_ref) {
      var config = _ref.config;
      var callback = _ref.callback;
      var uri = config.uri;
      var key = config.key;
      var noCache = config.noCache;

      this.uri = uri;
      this.key = key;
      noCache !== undefined && (this.noCache = noCache);

      var storeKey = PREFIX + ":" + key + ":" + uri;
      var storeCode = Store.getItem(storeKey);

      this.storeKey = storeKey;
      noCache || (this.code = storeCode);

      if (!storeCode) {
        // 如果没有存储脚本，清除之前版本的key
        // 清理操作不阻塞主脚本
        setTimeout(function () {
          clearStore(key);
        }, 0);

        // 如果传递了回调函数，存放到`callbacks`中
        if (callback) {
          this.callbacks.push(callback);
        }
      } else {
        callback && this.apply(callback);
      }

      return this;
    },
    add: function add(func) {
      var storeKey = this.storeKey;

      var funcString = func.toString();

      this.code = funcString;
      this.noCache || Store.setItem(storeKey, funcString);
      execCode(funcString);
    },
    apply: function apply(callback) {
      var code = this.code;
      var uri = this.uri;
      var noCache = this.noCache;
      var callbacks = this.callbacks;
      var loadRemote = this.loadRemote;

      if (code && !noCache) {
        execCode(code, callback);
      } else {
        callbacks.push(callback);
        if (!loadRemote) {
          loadScript(uri, function () {
            callbacks.forEach(function (item, key) {
              item();
            });
          });
          this.loadRemote = true;
        }
      }
    },
    clear: function clear(key) {
      clearStore(PREFIX + ":" + key);
    }
  };

  return function (config, callback) {
    return new Battery().init({
      config: config,
      callback: callback
    });
  };
})(window, document);