import { WinApi } from "./win_api";

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

    private height: number = 0; //棋盘高度
    private width: number = 0;  //棋盘宽度
    private mine_count: number = 0; //地雷数量
    private head: NativePointer = ptr(0);   //棋盘指针

    private hWnd: NativePointer = ptr(0);   //窗口句柄
    private winApi = new WinApi();          //引入的API类

    constructor() {
        //获取模块基址
        this.module_winmine = Process.getModuleByName(this.module_name_winmine);
    }

    private load_board_info() {
        this.height = this.module_winmine.base.add(0x5338).readU32();
        this.width = this.module_winmine.base.add(0x5334).readU32();
        this.mine_count = this.module_winmine.base.add(0x5330).readU32();
        this.head = this.module_winmine.base.add(0x5340);
        //这里从游戏里拿到的，通用方法直接用API FindWindow
        this.hWnd = this.module_winmine.base.add(0x5B24).readPointer();
    }

    board_info() {
        this.visit_board()
    }

    visit_board(modify: boolean = false) {
        this.load_board_info()

        //遍历棋盘，按行遍历
        for (let i = 0; i < this.height + 2; i++) {
            //按列遍历
            let data = [];
            for (let j = 0; j < this.width + 2; j++) {
                let byte_data =this. head.add(j + 0x20 * i).readU8();

                if (modify == true) {
                    if (byte_data == 0x8F) {
                        this.head.add(j + 0x20 * i).writeU8(0x8E);
                    }
                }
                else {
                    data.push(byte_data.toString(16).padStart(2, '0'));
                }
 
            }

            if (modify != true) {
                console.log(data.join(" "));
            }
        }
    }

    board_repaint() {
        const lpRect = Memory.alloc(4 * 4); //RECT
        this.winApi.GetClientRect(this.hWnd, lpRect);
        this.winApi.InvalidateRect(this.hWnd, lpRect, 1);
    }
}

function main()
{
    ///DevTools里在这里下断点。然后主动调用main()即可断下
    //一旦import了多个模块之后，就无法直接试用main()执行了，会提示函数无法找到，此时需要用rpc.exports.main()
    console.log("Start");
    ShowState();

    let scanner = new ScanGame();
    scanner.visit_board(true);
    scanner.board_info();
    scanner.board_repaint();

    console.log("End");
}

//导出一个函数，方便我们主动调用，进行调试。
rpc.exports = {
    main: function () {
        main();
    },
  };

//
main()
console.log("Finish ");
