// src/MavkaFS.ts
var MavkaFS = class {
};

// src/InMemoryMavkaFS.ts
var InMemoryMavkaFS = class extends MavkaFS {
  files;
  constructor() {
    super();
    this.files = /* @__PURE__ */ new Map();
  }
  writeFileSync(path, content) {
    const absolutePath = this.getAbsolutePath(path);
    this.files.set(absolutePath, content);
  }
  readFileSync(path) {
    const absolutePath = this.getAbsolutePath(path);
    return this.files.get(absolutePath) ?? null;
  }
  checkIfExistsAndIsFile(path) {
    const absolutePath = this.getAbsolutePath(path);
    return this.files.has(absolutePath);
  }
  getAbsolutePath(path) {
    let resolvedPath = path.startsWith("/") ? path : "/" + path;
    const parts = resolvedPath.split("/");
    const stack = [];
    for (const part of parts) {
      if (part === "" || part === ".") {
        continue;
      }
      if (part === "..") {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return "/" + stack.join("/");
  }
};

// src/LocalStorageMavkaFS.ts
var LocalStorageMavkaFS = class extends MavkaFS {
  prefix;
  localStorage;
  constructor(prefix, localStorage) {
    super();
    this.prefix = prefix || "";
    this.localStorage = localStorage;
  }
  readFileSync(path) {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    const base64String = this.localStorage.getItem(storageKey);
    if (base64String === null) {
      return null;
    }
    const binaryString = atob(base64String);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  checkIfExistsAndIsFile(path) {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    return this.localStorage.getItem(storageKey) !== null;
  }
  getAbsolutePath(path) {
    let resolvedPath = path.startsWith("/") ? path : "/" + path;
    const parts = resolvedPath.split("/");
    const stack = [];
    for (const part of parts) {
      if (part === "" || part === ".") {
        continue;
      }
      if (part === "..") {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return "/" + stack.join("/");
  }
  writeFileSync(path, content) {
    const absolutePath = this.getAbsolutePath(path);
    const storageKey = this.prefix + absolutePath;
    let base64String;
    if (typeof content === "string") {
      const bytes = new TextEncoder().encode(content);
      base64String = btoa(String.fromCharCode(...bytes));
    } else {
      base64String = btoa(String.fromCharCode(...content));
    }
    this.localStorage.setItem(storageKey, base64String);
  }
};

// src/MavkaBib.ts
var MavkaBib = class {
};

// src/MavkaProcess.ts
var MavkaNOColor = 0;
var MavkaColorRED = 1;
var MavkaColorGREEN = 2;
var MavkaBLUE = 3;
var MavkaYELLOW = 4;
var MavkaProcess = class {
};

// src/MavkaWASM.ts
var MavkaWASM = class {
  fs;
  process;
  bib;
  instance = null;
  utf8Decoder = new TextDecoder("utf-8");
  textEncoder = new TextEncoder();
  constructor(fs, process, bib) {
    this.fs = fs;
    this.process = process;
    this.bib = bib;
  }
  getExports() {
    if (!this.instance) {
      throw new Error("Not instantiated!");
    }
    return this.instance.exports;
  }
  getMemoryBuffer() {
    return this.getExports().memory.buffer;
  }
  mapFn(ptr) {
    const exports = this.getExports();
    const table = exports.__indirect_function_table || exports.table;
    return table.get(ptr);
  }
  malloc(size) {
    return this.getExports().\u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0432\u0438\u0434\u0456\u043B\u0438\u0442\u0438(size);
  }
  realloc(value, size) {
    return this.getExports().\u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0435\u0440\u0435\u0432\u0438\u0434\u0456\u043B\u0438\u0442\u0438(value, size);
  }
  free(value) {
    this.getExports().\u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0437\u0432\u0456\u043B\u044C\u043D\u0438\u0442\u0438(value);
  }
  extractString(dataPtr, size) {
    const byteBuffer = new Uint8Array(
      this.getMemoryBuffer(),
      Number(dataPtr),
      Number(size)
    );
    return this.utf8Decoder.decode(byteBuffer);
  }
  sharePtrs(ptrs) {
    const elementCount = ptrs.length;
    const byteSize = BigInt(elementCount * 8);
    const arrayPtr = this.malloc(byteSize);
    const wasmMemoryView = new BigInt64Array(
      this.getMemoryBuffer(),
      Number(arrayPtr),
      elementCount
    );
    wasmMemoryView.set(ptrs);
    return [arrayPtr, byteSize];
  }
  shareString(str) {
    const encodedString = this.textEncoder.encode(str);
    const size = BigInt(encodedString.length);
    const sizeWithNull = size + 1n;
    const ptr = this.malloc(sizeWithNull);
    const wasmMemoryView = new Uint8Array(
      this.getMemoryBuffer(),
      Number(ptr),
      Number(sizeWithNull)
    );
    wasmMemoryView.set(encodedString);
    wasmMemoryView[Number(size)] = 0;
    return [ptr, size];
  }
  storeU64(value, ptr) {
    const wasmMemoryView = new BigUint64Array(
      this.getMemoryBuffer(),
      Number(ptr),
      1
    );
    wasmMemoryView[0] = value;
  }
  storePtr(value, ptr) {
    this.storeU64(value, ptr);
  }
  storeBufferPtr(buf, ptr) {
    const size = BigInt(buf.byteLength);
    const bufPtr = this.malloc(size);
    const wasmDataView = new Uint8Array(
      this.getMemoryBuffer(),
      Number(bufPtr),
      buf.byteLength
    );
    wasmDataView.set(buf);
    this.storePtr(bufPtr, ptr);
  }
  storeString(value, dataPtr, lenPtr) {
    const [ptr, size] = this.shareString(value);
    this.storePtr(ptr, dataPtr);
    this.storeU64(size, lenPtr);
  }
  loadU64(ptr) {
    const wasmMemoryView = new BigUint64Array(
      this.getMemoryBuffer(),
      Number(ptr),
      1
    );
    return wasmMemoryView[0];
  }
  handleConversion(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) {
    const strval = String(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F).replace(/[eE]/g, "\u0435");
    this.storeString(strval, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
    return true;
  }
  async instantiate(wasmBuffer) {
    if (this.instance) {
      throw new Error("Already instantiated!");
    }
    const env = {
      fmod: (a, b) => a % b,
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0447\u0438\u0442\u0430\u0442\u0438_\u044E8: (\u0434\u0430\u043D\u0456_\u043F\u0435\u0440\u0435\u0434, \u0440\u043E\u0437\u043C\u0456\u0440_\u043F\u0435\u0440\u0435\u0434, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443, \u0432\u0438\u0445\u0456\u0434_\u043A\u0456\u043D\u0435\u0446\u044C_\u0444\u0430\u0439\u043B\u0443, \u0434\u043E\u0437\u0432\u043E\u043B\u0438\u0442\u0438_\u0456\u0441\u0442\u043E\u0440\u0456\u044E) => {
        return false;
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0447\u0438\u0442\u0430\u0442\u0438_\u044E8_\u0430\u0441\u0438\u043D\u0445\u0440\u043E\u043D\u043D\u043E: (\u0434\u0430\u043D\u0456_\u043F\u0435\u0440\u0435\u0434, \u0440\u043E\u0437\u043C\u0456\u0440_\u043F\u0435\u0440\u0435\u0434, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442, \u0434\u043E\u0437\u0432\u043E\u043B\u0438\u0442\u0438_\u0456\u0441\u0442\u043E\u0440\u0456\u044E) => {
        const prefix = this.extractString(\u0434\u0430\u043D\u0456_\u043F\u0435\u0440\u0435\u0434, \u0440\u043E\u0437\u043C\u0456\u0440_\u043F\u0435\u0440\u0435\u0434);
        const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
        this.process.readline((value) => {
          if (value != null) {
            const [ptr, size] = this.shareString(value);
            callback(ptr, size, 0n, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          } else {
            callback(0n, 0n, 1n, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          }
        }, prefix);
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0432\u0438\u0432\u0435\u0441\u0442\u0438_\u044E8: (\u043A\u043E\u043B\u0456\u0440, \u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440) => {
        this.process.print(
          this.extractString(\u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440),
          Number(\u043A\u043E\u043B\u0456\u0440)
        );
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0432\u0438\u0432\u0435\u0441\u0442\u0438_\u0448\u043B\u044F\u0445: (\u043A\u043E\u043B\u0456\u0440, \u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440) => {
        this.process.print(
          this.extractString(\u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440),
          Number(\u043A\u043E\u043B\u0456\u0440)
        );
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0438_\u044064_\u0432_\u044E8: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443_\u0435\u043A\u0441\u043F\u043E\u043D\u0435\u043D\u0442\u0438) => {
        return this.handleConversion(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0438_\u044664_\u0432_\u044E8: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) => {
        return this.handleConversion(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0435\u0440\u0435\u0442\u0432\u043E\u0440\u0438\u0442\u0438_\u043F64_\u0432_\u044E8: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) => {
        return this.handleConversion(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0456\u0434\u043D\u0435\u0441\u0442\u0438_\u0434\u043E_\u0441\u0442\u0435\u043F\u0435\u043D\u044F_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F, \u0441\u0442\u0435\u043F\u0456\u043D\u044C) => {
        return \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F ** \u0441\u0442\u0435\u043F\u0456\u043D\u044C;
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u0432\u0438\u0439\u0442\u0438: (\u043A\u043E\u0434_\u0432\u0438\u0445\u043E\u0434\u0443) => {
        this.process.exit(\u043A\u043E\u0434_\u0432\u0438\u0445\u043E\u0434\u0443);
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u0438_\u0444\u0430\u0439\u043B: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) => {
        const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
        const result = this.fs.readFileSync(path);
        if (result == null) {
          return false;
        }
        if (typeof result === "string") {
          this.storeString(result, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
        } else {
          this.storeBufferPtr(result, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445);
          this.storeU64(BigInt(result.byteLength), \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
        }
        return true;
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043F\u0435\u0440\u0435\u0432\u0456\u0440\u0438\u0442\u0438_\u0447\u0438_\u0448\u043B\u044F\u0445_\u0456\u0441\u043D\u0443\u0454_\u0456_\u0454_\u0444\u0430\u0439\u043B\u043E\u043C: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443) => {
        return this.fs.checkIfExistsAndIsFile(
          this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443)
        );
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438_\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u0438\u0439_\u0448\u043B\u044F\u0445: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) => {
        const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
        const absPath = this.fs.getAbsolutePath(path);
        this.storeString(absPath, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
        return true;
      },
      \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438_\u043F\u043E\u0442\u043E\u0447\u043D\u0438\u0439_\u0448\u043B\u044F\u0445_\u043F\u0440\u043E\u0446\u0435\u0441\u0443: (\u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443) => {
        const cwd = this.process.getCwd();
        this.storeString(cwd, \u0432\u0438\u0445\u0456\u0434_\u0434\u0430\u043D\u0438\u0445, \u0432\u0438\u0445\u0456\u0434_\u0440\u043E\u0437\u043C\u0456\u0440\u0443);
        return true;
      }
    };
    const { instance } = await WebAssembly.instantiate(wasmBuffer, {
      env: new Proxy(env, {
        get(target, prop) {
          if (prop in target) {
            return target[prop];
          }
          return () => {
            throw new Error(`"${String(prop)}" \u043D\u0435 \u0432\u0442\u0456\u043B\u0435\u043D\u043E \u0434\u043B\u044F WASM!`);
          };
        }
      })
    });
    this.instance = instance;
  }
  getVersion() {
    const versionDataPtrPtr = this.malloc(8n);
    const versionSizePtr = this.malloc(8n);
    const result = this.getExports().\u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438_\u0432\u0435\u0440\u0441\u0456\u044E_\u044F\u043A_\u044E8(
      versionDataPtrPtr,
      versionSizePtr
    );
    if (!result) {
      throw new Error(
        `was not able to get mavka version: \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438_\u0432\u0435\u0440\u0441\u0456\u044E_\u044F\u043A_\u044E8 returns ${result}`
      );
    }
    const dataPtr = this.loadU64(versionDataPtrPtr);
    const size = this.loadU64(versionSizePtr);
    const value = this.extractString(dataPtr, size);
    this.free(versionDataPtrPtr);
    this.free(versionSizePtr);
    return value;
  }
  run(args) {
    const exports = this.getExports();
    const \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0438 = args.map((arg) => {
      if (typeof arg !== "string") {
        throw new Error("args must be strings!");
      }
      return this.shareString(arg)[0];
    });
    const [ptr] = this.sharePtrs(\u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u0438);
    return exports.wasmMain(args.length, ptr);
  }
};

// src/NodeMavkaFS.ts
var NodeMavkaFS = class extends MavkaFS {
  node;
  constructor(node) {
    super();
    this.node = node;
  }
  readFileSync(path) {
    try {
      return this.node.fs.readFileSync(path);
    } catch {
      return null;
    }
  }
  checkIfExistsAndIsFile(path) {
    try {
      return this.node.fs.statSync(path).isFile();
    } catch {
      return false;
    }
  }
  getAbsolutePath(path) {
    return this.node.path.resolve(path);
  }
};

// src/NodeMavkaProcess.ts
var COLORS_MAP = {
  [MavkaNOColor]: "\x1B[0m",
  [MavkaColorRED]: "\x1B[31m",
  [MavkaColorGREEN]: "\x1B[32m",
  [MavkaBLUE]: "\x1B[34m",
  [MavkaYELLOW]: "\x1B[33m"
};
var NodeMavkaProcess = class extends MavkaProcess {
  rl = null;
  readlineCallback = null;
  node;
  constructor(node) {
    super();
    this.node = node;
  }
  print(value, color) {
    if (color) {
      const selectedColor = COLORS_MAP[color] || COLORS_MAP[MavkaNOColor];
      this.node.process.stdout.write(
        `${selectedColor}${value}${COLORS_MAP[MavkaNOColor]}`
      );
    } else {
      this.node.process.stdout.write(value);
    }
  }
  readline(callback, prefix) {
    this.readlineCallback = callback;
    this.getRl().question(prefix, (value) => {
      this.readlineCallback = null;
      callback(value);
    });
  }
  getRl() {
    if (this.rl) return this.rl;
    this.rl = this.node.readline.createInterface({
      input: this.node.process.stdin,
      output: this.node.process.stdout
    });
    this.rl.on("close", () => {
      this.rl = null;
      if (this.readlineCallback) {
        const cb = this.readlineCallback;
        this.readlineCallback = null;
        cb();
      }
    });
    return this.rl;
  }
  getCwd() {
    return this.node.process.cwd();
  }
  exit(code) {
    if (this.rl) {
      this.rl.close();
    }
    this.node.process.exit(code);
  }
};
export {
  InMemoryMavkaFS,
  LocalStorageMavkaFS,
  MavkaBLUE,
  MavkaBib,
  MavkaColorGREEN,
  MavkaColorRED,
  MavkaFS,
  MavkaNOColor,
  MavkaProcess,
  MavkaWASM,
  MavkaYELLOW,
  NodeMavkaFS,
  NodeMavkaProcess
};
