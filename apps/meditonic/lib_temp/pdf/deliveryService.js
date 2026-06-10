"use strict";
/**
 * lib/pdf/deliveryService.ts
 * Orchestrates the full PDF delivery pipeline.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deliverPdfs = deliverPdfs;
var client_s3_1 = require("@aws-sdk/client-s3");
var s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
var watermark_1 = require("./watermark");
var s3Keys_1 = require("./s3Keys");
var BUCKET = process.env.AWS_S3_BUCKET_NAME;
var REGION = process.env.AWS_REGION || 'eu-north-1';
var URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days
var s3 = new client_s3_1.S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
/**
 * Streams an S3 object into a Buffer
 */
function s3ToBuffer(key) {
    return __awaiter(this, void 0, void 0, function () {
        var cmd, res, chunks, _a, _b, _c, chunk, e_1_1;
        var _d, e_1, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
                    return [4 /*yield*/, s3.send(cmd)];
                case 1:
                    res = _g.sent();
                    if (!res.Body)
                        throw new Error("Empty body for key: ".concat(key));
                    chunks = [];
                    _g.label = 2;
                case 2:
                    _g.trys.push([2, 7, 8, 13]);
                    _a = true, _b = __asyncValues(res.Body);
                    _g.label = 3;
                case 3: return [4 /*yield*/, _b.next()];
                case 4:
                    if (!(_c = _g.sent(), _d = _c.done, !_d)) return [3 /*break*/, 6];
                    _f = _c.value;
                    _a = false;
                    chunk = _f;
                    chunks.push(chunk);
                    _g.label = 5;
                case 5:
                    _a = true;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 13];
                case 7:
                    e_1_1 = _g.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 8:
                    _g.trys.push([8, , 11, 12]);
                    if (!(!_a && !_d && (_e = _b.return))) return [3 /*break*/, 10];
                    return [4 /*yield*/, _e.call(_b)];
                case 9:
                    _g.sent();
                    _g.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 12: return [7 /*endfinally*/];
                case 13: return [2 /*return*/, Buffer.concat(chunks)];
            }
        });
    });
}
/**
 * Generates a presigned GET URL for an S3 key
 */
function presignedUrl(key) {
    return __awaiter(this, void 0, void 0, function () {
        var cmd;
        return __generator(this, function (_a) {
            cmd = new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: key });
            return [2 /*return*/, (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn: URL_EXPIRY_SECONDS })];
        });
    });
}
/**
 * Processes a single book item
 */
function processItem(item, buyer) {
    return __awaiter(this, void 0, void 0, function () {
        var slug, docName, originalKey, originalBuffer, finalBuffer, wmError_1, wKey, downloadUrl, expiresAt, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    slug = item.slug || (0, s3Keys_1.bookSlug)(item.title);
                    docName = item.doctor_name || 'Dr. Aman Agarwal';
                    originalKey = "store-items/by-doctor/".concat((0, s3Keys_1.slugify)(docName), "/ebooks/originals/").concat(slug, "/").concat(slug, ".pdf");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 9, , 10]);
                    return [4 /*yield*/, s3ToBuffer(originalKey)];
                case 2:
                    originalBuffer = _a.sent();
                    finalBuffer = void 0;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, watermark_1.addWatermark)(originalBuffer, {
                            name: buyer.name,
                            email: buyer.email,
                            phone: buyer.phone,
                            orderRef: buyer.orderRef,
                            date: buyer.date,
                        })];
                case 4:
                    finalBuffer = _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    wmError_1 = _a.sent();
                    console.error("[PDF] ERROR: Failed to watermark ".concat(item.title, ". The PDF may be encrypted or use unsupported compression. Error: ").concat(wmError_1.message));
                    throw new Error("Watermark failed for ".concat(item.title));
                case 6:
                    wKey = "store-items/by-doctor/".concat((0, s3Keys_1.slugify)(docName), "/ebooks/orders/").concat(buyer.orderRef, "/").concat(slug, "-watermarked.pdf");
                    // 5. Upload watermarked copy
                    return [4 /*yield*/, s3.send(new client_s3_1.PutObjectCommand({
                            Bucket: BUCKET,
                            Key: wKey,
                            Body: finalBuffer,
                            ContentType: 'application/pdf',
                            Metadata: {
                                'buyer-name': buyer.name,
                                'buyer-email': buyer.email,
                                'buyer-phone': buyer.phone || '',
                                'order-ref': buyer.orderRef,
                            },
                        }))];
                case 7:
                    // 5. Upload watermarked copy
                    _a.sent();
                    return [4 /*yield*/, presignedUrl(wKey)];
                case 8:
                    downloadUrl = _a.sent();
                    expiresAt = new Date(Date.now() + URL_EXPIRY_SECONDS * 1000).toISOString();
                    return [2 /*return*/, {
                            title: item.title,
                            downloadUrl: downloadUrl,
                            expiresAt: expiresAt,
                            s3Key: wKey,
                            summary: item.summary,
                        }];
                case 9:
                    err_1 = _a.sent();
                    console.error("[PDF] Failed to process ".concat(item.title, " (Key: ").concat(originalKey, "):"), err_1.message);
                    return [2 /*return*/, null];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main delivery function — processes all ebook items in an order.
 *
 * @param order - Full mt_orders row from DB
 * @param items - Items extracted from order JSON
 */
function deliverPdfs(order, items) {
    return __awaiter(this, void 0, void 0, function () {
        var buyer, ebookItems, results, delivered, _i, results_1, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    buyer = {
                        name: order.customer_name || 'Valued Customer',
                        email: order.customer_email || '',
                        phone: order.customer_phone || '',
                        orderRef: order.id,
                        date: new Date(order.created_at || Date.now()).toLocaleDateString(),
                    };
                    ebookItems = items.filter(function (i) { return i.stock_status !== 'out_of_stock'; });
                    if (ebookItems.length === 0) {
                        console.log("[PDF] No ebook items to deliver for order ".concat(order.id));
                        return [2 /*return*/, []];
                    }
                    return [4 /*yield*/, Promise.allSettled(ebookItems.map(function (item) { return processItem(item, buyer); }))];
                case 1:
                    results = _a.sent();
                    delivered = [];
                    for (_i = 0, results_1 = results; _i < results_1.length; _i++) {
                        result = results_1[_i];
                        if (result.status === 'fulfilled' && result.value) {
                            delivered.push(result.value);
                        }
                        else if (result.status === 'rejected') {
                            console.error('[PDF] Item delivery failed:', result.reason);
                        }
                    }
                    return [2 /*return*/, delivered];
            }
        });
    });
}
