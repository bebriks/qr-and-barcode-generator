import { generateCode128Pattern } from '../utils/utils-barcode';
import { BarcodeModule } from '../utils/utils-barcode';
export class Barcode {
    #message: string;
    modules: BarcodeModule[];

    constructor(message: string) {
        this.#message = message;
        this.modules = generateCode128Pattern(this.#message);
    }

    init(){
        return this.modules;
    }
}