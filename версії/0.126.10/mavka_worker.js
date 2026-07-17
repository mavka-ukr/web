(() => {
  // package.json
  var package_default = {
    name: "mavka",
    version: "0.126.10",
    description: "\u041C\u0430\u0432\u043A\u0430 \u0434\u043B\u044F JavaScript",
    license: "MIT",
    author: "OM",
    type: "module",
    main: "./src/index.js",
    scripts: {
      "dist:esm": "esbuild src/index.ts --bundle --format=esm --outfile=dist/mavka.js",
      "dist:worker": "esbuild web/mavka_worker.ts --bundle --outfile=dist/mavka_worker.js",
      dist: "npm run dist:esm && npm run dist:worker",
      "buildforpublish:src": "tsc --module esnext --allowImportingTsExtensions --rewriteRelativeImportExtensions src/*.ts --outDir buildforpublish/src",
      "buildforpublish:bin": "tsc --module esnext --types node --allowImportingTsExtensions --rewriteRelativeImportExtensions bin/mavka.ts --outDir buildforpublish"
    },
    exports: {
      ".": "./src/index.js"
    },
    bin: {
      mavka: "bin/mavka.js"
    },
    devDependencies: {
      "@types/node": "^26.0.1",
      esbuild: "^0.28.1",
      prettier: "3.8.5",
      typescript: "^6.0.3"
    },
    mavkaVersion: "0.126.4"
  };

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
    delete(path, callback) {
      const absolutePath = this.getAbsolutePath(path);
      const existed = this.files.has(absolutePath);
      if (existed) {
        this.files.delete(absolutePath);
        callback(true, 0);
      } else {
        callback(false, 0);
      }
    }
    append(path, data, callback) {
      const absolutePath = this.getAbsolutePath(path);
      const existing = this.files.get(absolutePath);
      if (existing === void 0) {
        this.files.set(absolutePath, data);
      } else {
        const existingBytes = typeof existing === "string" ? new TextEncoder().encode(existing) : existing;
        const combined = new Uint8Array(existingBytes.length + data.length);
        combined.set(existingBytes, 0);
        combined.set(data, existingBytes.length);
        this.files.set(absolutePath, combined);
      }
      callback(0);
    }
    write(path, data, callback) {
      const absolutePath = this.getAbsolutePath(path);
      this.files.set(absolutePath, data);
      callback(0);
    }
    read(path, callback) {
      const absolutePath = this.getAbsolutePath(path);
      const file = this.files.get(absolutePath);
      if (file === void 0) {
        callback(new Uint8Array(0), 1);
        return;
      }
      const data = typeof file === "string" ? new TextEncoder().encode(file) : file;
      callback(data, 0);
    }
    mkdir(path, callback) {
      callback(0);
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
    extractBytes(dataPtr, size) {
      return new Uint8Array(
        this.getMemoryBuffer(),
        Number(dataPtr),
        Number(size)
      );
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
    shareBytes(data) {
      const size = BigInt(data.length);
      const ptr = this.malloc(size);
      const wasmMemoryView = new Uint8Array(
        this.getMemoryBuffer(),
        Number(ptr),
        Number(size)
      );
      wasmMemoryView.set(data);
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
    storeNumber(value, ptr) {
      const wasmMemoryView = new Float64Array(
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
      let strval;
      if (Number.isNaN(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F)) {
        strval = "\u043D\u0435\u0432\u0438\u0437\u043D\u0430\u0447\u0435\u043D\u0456\u0441\u0442\u044C";
      } else if (typeof \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F === "number" && Math.abs(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) === Infinity) {
        strval = "\u043D\u0435\u0441\u043A\u0456\u043D\u0447\u0435\u043D\u043D\u0456\u0441\u0442\u044C";
      } else {
        strval = String(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F).replace(/[eE]/g, "\u0435");
      }
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
        \u043F\u0440\u0438\u0441\u0442\u0440\u0456\u0439_\u043C\u0430\u0432\u043A\u0438_\u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438_\u044064_\u0437_\u044E8: (\u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440, \u0432\u0438\u0445\u0456\u0434) => {
          const value = this.extractString(\u0434\u0430\u043D\u0456, \u0440\u043E\u0437\u043C\u0456\u0440).replaceAll("\u0435", "e").replaceAll("\u0415", "E");
          try {
            this.storeNumber(parseFloat(value), \u0432\u0438\u0445\u0456\u0434);
          } catch (e) {
            return 0;
          }
          return 1;
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
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0441\u0438\u043D\u0443\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.sin(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043A\u043E\u0441\u0438\u043D\u0443\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.cos(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0442\u0430\u043D\u0433\u0435\u043D\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.tan(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0440\u043A\u0441\u0438\u043D\u0443\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.asin(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0440\u043A\u043A\u043E\u0441\u0438\u043D\u0443\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.acos(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0440\u043A\u0442\u0430\u043D\u0433\u0435\u043D\u0441_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.atan(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0431\u0441\u043E\u043B\u044E\u0442\u043D\u0435_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.abs(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0435\u043A\u0441\u043F\u043E\u043D\u0435\u043D\u0442\u0430_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.exp(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043A\u043E\u0440\u0456\u043D\u044C2_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.sqrt(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0441\u0442\u0435\u043B\u044F_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.ceil(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043F\u0456\u0434\u043B\u043E\u0433\u0430_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.floor(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043E\u043A\u0440\u0443\u0433\u043B\u0438\u0442\u0438_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.round(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043B\u043E\u0433_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.log(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043B\u043E\u04332_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.log2(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u043B\u043E\u043310_\u044064: (\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F) => {
          return Math.log10(\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F);
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0444\u0441_\u0432\u0438\u0434\u0430\u043B\u0438\u0442\u0438: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442) => {
          const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
          const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
          this.fs.delete(path, (result, error) => {
            callback(result ? 1n : 0n, BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          });
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0444\u0441_\u0434\u043E\u043F\u0438\u0441\u0430\u0442\u0438: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u0434\u0430\u043D\u0456_\u0434\u0430\u043D\u0438\u0445, \u0440\u043E\u0437\u043C\u0456\u0440_\u0434\u0430\u043D\u0438\u0445, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442) => {
          const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
          const data = this.extractBytes(\u0434\u0430\u043D\u0456_\u0434\u0430\u043D\u0438\u0445, \u0440\u043E\u0437\u043C\u0456\u0440_\u0434\u0430\u043D\u0438\u0445);
          const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
          this.fs.append(path, data, (error) => {
            callback(BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          });
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0444\u0441_\u0437\u0430\u043F\u0438\u0441\u0430\u0442\u0438: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u0434\u0430\u043D\u0456_\u0434\u0430\u043D\u0438\u0445, \u0440\u043E\u0437\u043C\u0456\u0440_\u0434\u0430\u043D\u0438\u0445, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442) => {
          const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
          const data = this.extractBytes(\u0434\u0430\u043D\u0456_\u0434\u0430\u043D\u0438\u0445, \u0440\u043E\u0437\u043C\u0456\u0440_\u0434\u0430\u043D\u0438\u0445);
          const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
          this.fs.write(path, data, (error) => {
            callback(BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          });
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0444\u0441_\u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u0438: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442) => {
          const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
          const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
          this.fs.read(path, (data, error) => {
            if (error) {
              callback(0n, 0n, BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
            } else {
              const [ptr, size] = this.shareBytes(data);
              callback(ptr, size, BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
            }
          });
        },
        \u0431\u0456\u0431\u043B\u0456\u043E\u0442\u0435\u043A\u0430_\u043C\u0430\u0432\u043A\u0438_\u0430\u0444\u0441_\u0441\u0442\u0432\u043E\u0440\u0438\u0442\u0438_\u043F\u0430\u043F\u043A\u0443: (\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443, \u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A, \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442) => {
          const path = this.extractString(\u0434\u0430\u043D\u0456_\u0448\u043B\u044F\u0445\u0443, \u0440\u043E\u0437\u043C\u0456\u0440_\u0448\u043B\u044F\u0445\u0443);
          const callback = this.mapFn(\u043E\u0431\u0440\u043E\u0431\u043D\u0438\u043A);
          this.fs.mkdir(path, (error) => {
            callback(BigInt(error), \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442);
          });
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

  // src/NodeMavkaProcess.ts
  var COLORS_MAP = {
    [MavkaNOColor]: "\x1B[0m",
    [MavkaColorRED]: "\x1B[31m",
    [MavkaColorGREEN]: "\x1B[32m",
    [MavkaBLUE]: "\x1B[34m",
    [MavkaYELLOW]: "\x1B[33m"
  };

  // web/mavka_worker.ts
  var ExitMavkaException = class extends Error {
    exitCode;
    constructor(exitCode) {
      super("Mavka exited with code " + exitCode);
      this.exitCode = exitCode;
    }
  };
  var COLORS_MAP2 = {
    [MavkaNOColor]: void 0,
    [MavkaColorRED]: "red",
    [MavkaColorGREEN]: "green",
    [MavkaBLUE]: "blue",
    [MavkaYELLOW]: "yellow"
  };
  var eid = 0;
  var listeners = /* @__PURE__ */ new Map();
  var running = null;
  var WebMavkaProcess = class extends MavkaProcess {
    constructor() {
      super();
    }
    print(value, color) {
      if (color) {
        self.postMessage({ type: "PRINT", value, color: COLORS_MAP2[color] });
      } else {
        self.postMessage({ type: "PRINT", value });
      }
    }
    readline(callback, prefix) {
      if (!running) {
        return;
      }
      running.callbacksCount++;
      const id = eid++;
      self.postMessage({ type: "READLINE", id, prefix });
      listeners.set(id, callback);
    }
    getCwd() {
      return "/";
    }
    exit(code) {
      throw new ExitMavkaException(code);
    }
  };
  var WebMavkaBib = class extends MavkaBib {
  };
  var textEncoder = new TextEncoder();
  var textDecoder = new TextDecoder();
  var mfs = new InMemoryMavkaFS();
  var mproc = new WebMavkaProcess();
  var mbib = new WebMavkaBib();
  var mw = new MavkaWASM(mfs, mproc, mbib);
  self.onmessage = (event) => {
    const eventData = event.data;
    if (eventData && typeof eventData === "object") {
      const type = eventData.type;
      const id = eventData.id;
      if (type === "INIT") {
        const mavkaWebUrl = eventData.mavkaWebUrl || "https://\u0432\u0435\u0431.\u043C\u0430\u0432\u043A\u0430.\u0443\u043A\u0440";
        fetch(`${mavkaWebUrl}/wasm/\u043C\u0430\u0432\u043A\u0430-${package_default.mavkaVersion}.wasm`).then((r) => r.arrayBuffer()).then((buffer) => mw.instantiate(buffer)).then(() => {
          self.postMessage({ type: "MAVKA_READY" });
        });
      }
      if (type === "WRITE") {
        const path = eventData.path;
        const value = eventData.value;
        if (typeof value === "string" || value instanceof Uint8Array) {
          mfs.writeFileSync(path, value);
          self.postMessage({ type: "WRITE_RESULT", id });
        } else {
          self.postMessage({ type: "WRITE_RESULT", id, error: "Can write only string and Uint8Array!" });
        }
      }
      if (type === "READ") {
        const path = eventData.path;
        const resultType = eventData.resultType;
        let result = mfs.readFileSync(path);
        if (typeof result === "string") {
          if (resultType === "bytes") {
            result = textEncoder.encode(result);
          }
        }
        if (result instanceof Uint8Array) {
          if (resultType === "string") {
            result = textDecoder.decode(result);
          }
        }
        self.postMessage({ type: "READ_RESULT", id, result });
      }
      if (type === "RUN") {
        if (running) {
          console.warn("Already running!");
          return;
        }
        running = { id, callbacksCount: 0 };
        const args = eventData.args;
        let resultCode = 0;
        let error = null;
        try {
          resultCode = mw.run([
            "/\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u0438/\u043C\u0430\u0432\u043A\u0430",
            ...args
          ]);
        } catch (e) {
          if (e && e instanceof ExitMavkaException) {
            resultCode = e.exitCode;
          } else {
            resultCode = 1;
          }
          error = String(e);
        }
        if (resultCode !== 0 || running.callbacksCount === 0) {
          self.postMessage({ type: "RUN_RESULT", id: running.id, resultCode, error });
          running = null;
        }
      }
      if (type === "READLINE_RESULT") {
        if (!running) {
          console.warn("Not running!");
          return;
        }
        running.callbacksCount--;
        const value = eventData.value;
        const l = listeners.get(id);
        let resultCode = 0;
        let error = null;
        try {
          l(value);
        } catch (e) {
          if (e && e instanceof ExitMavkaException) {
            resultCode = e.exitCode;
          } else {
            resultCode = 1;
          }
          error = String(e);
        }
        if (resultCode !== 0 || running.callbacksCount === 0) {
          self.postMessage({ type: "RUN_RESULT", id: running.id, resultCode, error });
          running = null;
        }
      }
    }
  };
})();
