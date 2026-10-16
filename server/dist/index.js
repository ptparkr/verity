"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const PORT = Number(process.env.PORT || 3001);
async function start() {
    await (0, app_1.ensureDbReady)();
    app_1.app.listen(PORT, () => {
        console.log(`[verity] server running on http://localhost:${PORT}`);
    });
}
void start();
