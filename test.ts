function ShowState() {
    console.log("======================", new Date().toISOString(), "==========================");
    console.log("Frida.version", Frida.version);
    console.log("Frida.heapSize", Frida.heapSize);
    console.log(Process.id);
    console.log(Process.arch);
    console.log(Process.codeSigningPolicy);
    let modules = Process.enumerateModules();
    for (const iterator of modules) {
        console.log(iterator.base, iterator.name, iterator.size);
    }
}



class ScanGame {
    private module_name_winmine = "winmine.exe";
    private module_winmine: Module;

    constructor() {
        //获取模块基址
        this.module_winmine = Process.getModuleByName(this.module_name_winmine);
    }

    board_info() {
        let height = this.module_winmine.base.add(0x5338).readU32();
        console.log("棋盘高度:", height);

        let width = this.module_winmine.base.add(0x5334).readU32();
        console.log("棋盘宽度:", width);

        let mine_count = this.module_winmine.base.add(0x5330).readU32();
        console.log("地雷数量:", mine_count);

        let head = this.module_winmine.base.add(0x5340);
        console.log("棋盘头:", head);

        //遍历棋盘，按行遍历
        for (let i = 0; i < height + 2; i++) {
            //按列遍历
            let data = [];
            for (let j = 0; j < width + 2; j++) {
                let byte_data = head.add(j + 0x20 * i).readU8();
                data.push(byte_data.toString(16).padStart(2, '0'));
            }
            console.log(data.join(" "));
        }
    }
}

rpc.exports.main
function main()
{
    ///DevTools里在这里下断点。然后主动调用main()即可断下
    console.log("Start");

    ShowState();
    let scanner = new ScanGame();
    scanner.board_info();

    console.log("End");
}


//
main()
console.log("Finish");
