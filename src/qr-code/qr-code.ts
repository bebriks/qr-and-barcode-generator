import * as funcs from '../utils/utils-qr'

export class QRCode {
    #message: string
    name: string
    constructor(message: string) {
        this.name = 'qr'
        this.#message = message
    }
    init() {
        const qr = funcs.getRawQRCode(this.#message)
        return funcs.getMaskedQRCode(2, qr[0], 'L', 0)
    }
}