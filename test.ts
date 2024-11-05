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

class AutoMineGame {
    private module_name_winmine = "winmine.exe";
    private module_winmine: Module;

    private height: number = 0; //棋盘高度
    private width: number = 0;  //棋盘宽度
    private mine_count: number = 0; //地雷数量
    private head: NativePointer = ptr(0);   //棋盘指针

    private hWnd: NativePointer = ptr(0);   //窗口句柄

    private start_x = 0;
    private start_y = 0;
    private step = 16;

    private MOUSEEVENTF_LEFTDOWN = 0x0002;
    private MOUSEEVENTF_LEFTUP = 0x0004;
    private MOUSEEVENTF_RIGHTDOWN = 0x0008;
    private MOUSEEVENTF_RIGHTUP = 0x0010;

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
        WinApi.GetClientRect(this.hWnd, lpRect);
        WinApi.InvalidateRect(this.hWnd, lpRect, 1);
    }

    board_foreground() {
        let hForeWnd = WinApi.GetForegroundWindow();
        let dwCurID = WinApi.GetCurrentThreadId();
        let dwForeID = WinApi.GetWindowThreadProcessId(hForeWnd, ptr(0));
        WinApi.AttachThreadInput(dwCurID, dwForeID, 1);

        const SW_RESTORE = 9;
        WinApi.ShowWindow(this.hWnd, SW_RESTORE);

        WinApi.SetForegroundWindow(this.hWnd);

        const HWND_TOPMOST = -1;
        const HWND_NOTOPMOST = -2;
        const SWP_NOSIZE = 0x0001;
        const SWP_NOMOVE = 0x0002;
        WinApi.SetWindowPos(this.hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);
        WinApi.SetWindowPos(this.hWnd, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_NOSIZE | SWP_NOMOVE);

        WinApi.AttachThreadInput(dwCurID, dwForeID, 0);
    }

    board_location() {

        let lpOrgRect = Memory.alloc(4 * 4);
        WinApi.GetCursorPos(lpOrgRect);

        let lpRect = Memory.alloc(4 * 4);
        WinApi.GetWindowRect(this.hWnd, lpRect);
        console.log("left", lpRect.readU32());
        console.log("top", lpRect.add(4).readU32());

        this.start_x = lpRect.readU32() + 7;
        this.start_y = lpRect.add(4).readU32() + 92;
        let x = 4;
        let y = 5;

        WinApi.SetCursorPos(this.start_x + this.step * x, this.start_y + this.step * y);

        const MOUSEEVENTF_LEFTDOWN = 0x0002;
        const MOUSEEVENTF_LEFTUP = 0x0004;

        const MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const MOUSEEVENTF_RIGHTUP = 0x0010;

        WinApi.MouseEvent(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, WinApi.GetMessageExtraInfo());
        WinApi.MouseEvent(MOUSEEVENTF_LEFTUP, 0, 0, 0, WinApi.GetMessageExtraInfo());
    }

    mouse_click(x: number, y: number, left_click: boolean = true) {

        WinApi.SetCursorPos(this.start_x + this.step * x, this.start_y + this.step * y);
        if (left_click) {
            WinApi.MouseEvent(this.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, WinApi.GetMessageExtraInfo());
            WinApi.MouseEvent(this.MOUSEEVENTF_LEFTUP, 0, 0, 0, WinApi.GetMessageExtraInfo());
        }
        else {
            WinApi.MouseEvent(this.MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, WinApi.GetMessageExtraInfo());
            WinApi.MouseEvent(this.MOUSEEVENTF_RIGHTUP, 0, 0, 0, WinApi.GetMessageExtraInfo());
        }
    }

    board_click() {

        //记录鼠标位置
        let lpOrgRect = Memory.alloc(4 * 4);
        WinApi.GetCursorPos(lpOrgRect);

        //加载棋盘数据
        this.load_board_info();

        //获取棋盘位置
        let lpRect = Memory.alloc(4 * 4);
        WinApi.GetWindowRect(this.hWnd, lpRect);
        this.start_x = lpRect.readU32() + 7;
        this.start_y = lpRect.add(4).readU32() + 92;

        //遍历棋盘，按行遍历
        for (let i = 1; i < this.height + 2; i++) {
            //按列遍历
            for (let j = 1; j < this.width + 2; j++) {
                let byte_data = this.head.add(j + 0x20 * i).readU8();
                //标记地雷
                if (byte_data == 0x8F) {
                    this.mouse_click(j, i, false);
                    continue;
                }
                //点击无雷区
                if (byte_data == 0x0F) {
                    this.mouse_click(j, i);
                    continue;
                }
            }
        }

        //鼠标归位
        WinApi.SetCursorPos(lpOrgRect.readU32(), lpOrgRect.add(4).readU32());
    }
}

class HookMineGame {
    private module_name_winmine = "winmine.exe";
    private module_winmine: Module;

    constructor() {
        //获取模块基址
        this.module_winmine = Process.getModuleByName(this.module_name_winmine);
    }

    memory_utils() {
        
        //转成二进制
        let p = ptr(0x00210604);
        let pattern = p.toMatchPattern();
        console.log("pattern", pattern);

        //函数头特征
        pattern = "55 8b ec";

        Memory.scan(this.module_winmine.base, this.module_winmine.size, pattern, {
            onMatch: (address, size) => {
                //console.log("onMatch", size, address, address.sub(this.module_winmine.base));
            },
            onError: (reason) => {
                console.log(reason);
            },
            onComplete: () => {
                console.log("Scan Complete!");
            }
        });

        let matches = Memory.scanSync(this.module_winmine.base, this.module_winmine.size, pattern);
        for (const iterator of matches) {
            console.log(JSON.stringify(iterator));
        }

        /*
        let m1 = Memory.alloc(Process.pageSize);
        console.log("protect", JSON.stringify(Process.getRangeByAddress(m1)));
        Memory.protect(m1, Process.pageSize, "r-x");
        console.log("protect", JSON.stringify(Process.getRangeByAddress(m1)));*/

        //shellcode调用API
        let lpText = Memory.allocUtf16String("This is a string！");
        let lpCaption = Memory.allocUtf16String("Caption");

        let m2 = Memory.alloc(Process.pageSize);
        console.log("m2 addr=", m2);
        let address = Module.getExportByName("User32.dll", "MessageBoxW");

        Memory.patchCode(m2, Process.pageSize, (code) => {
            let asm = new X86Writer(code);
            asm.putPushU32(0x00000001);
            asm.putPushU32(lpCaption.toUInt32());
            asm.putPushU32(lpText.toUInt32());
            asm.putPushU32(0);

            asm.putCallAddress(address);
            asm.putRet();

            asm.flush();
        });

        this.show_asm(m2);
        
        // call 
        //let func = new NativeFunction(m2, "void", []);
        //func();
    }

    show_asm(start: NativePointer, length: number = 10) {

        for (let index = 0; index < length; index++) {
            let inst = Instruction.parse(start);
            // console.log(JSON.stringify(inst));
            let byteArray = start.readByteArray(inst.size);
            let byteCode = Array.prototype.slice.call(new Uint8Array(byteArray!));
            let mCode = byteCode.map(x => x.toString(16).padStart(2, "0")).join(" ").toUpperCase();
            console.log(inst.address.toString().toUpperCase().replace("0X", "0x"), mCode.padEnd(14, " "), "\t", inst.toString().toUpperCase().replace("0X", "0x"));

            start = inst.next;
            if (start.readU32() == 0) break;
        }
    }

    hook_func() {
        //DispatchMessageW
        let address = Module.getExportByName("User32.dll", "DispatchMessageW");

        console.log("Main Thread:", Process.enumerateThreads()[0].id);
        console.log("CurrentThreadId", Process.getCurrentThreadId());

        let listener = Interceptor.attach(address,{
            onEnter(this, args) {
                //console.log("onEnter context", JSON.stringify(this.context));

                // typedef struct tagMSG {
                //   HWND   hwnd;
                //   UINT   message;
                //   WPARAM wParam;
                //   LPARAM lParam;
                //   DWORD  time;
                //   POINT  pt;
                //   DWORD  lPrivate;
                // } MSG, *PMSG, *NPMSG, *LPMSG;                
                console.log("onEnter tid=", Process.getCurrentThreadId());

                let msg = args[0];
                console.log("hwnd", msg.readPointer());
                console.log("message", msg.add(4).readPointer());
                console.log("wParam", msg.add(8).readPointer());
                console.log("lParam", msg.add(12).readPointer());
                console.log("pt", msg.add(20).readPointer());
                console.log("lPrivate", msg.add(24).readPointer());
            },
            onLeave(this, retval) {
                //console.log("onLeave context", JSON.stringify(this.context));
                console.log("ret=",retval);
                //加上这个，相当于只Hook一次
                //listener.detach();
            },
        })
    }

    module_utils() {

        let moduleMap = new ModuleMap((m: Module) => { return m.name.endsWith("dll"); });
        for (const iterator of moduleMap.values()) {
            console.log(JSON.stringify(iterator));
        }
    }

    //很容易崩
    access_mon() {
        /*
        let rangs = Process.enumerateMallocRanges().filter(x => x.size > 2000);
        for (const iterator of rangs) {
            console.log(JSON.stringify(iterator));
        }*/
        
        // const targetRange = { base: this.module_winmine.base, size: 0x1000 };
        // MemoryAccessMonitor.enable(
        //     targetRange
        //     /*{   
        //         base : this.module_winmine.base,
        //         size : 0x1000
        //     }*/,
        //     {
        //         onAccess(details) {
        //             console.log("address", details.address, "from", details.from, "operation", details.operation, "pageIndex", details.pageIndex, "pagesCompleted", details.pagesCompleted, "pagesTotal", details.pagesTotal, "rangeIndex", details.rangeIndex);
        //             console.log("===");
        //         },
        //     });
        // console.log("MemoryAccessMonitor OK");

        let pattern = "4d 5a";
        Memory.scan(this.module_winmine.base, 0x1000, pattern, {
            onMatch: (address, size) => {
                console.log("onMatch", size, address, address.sub(this.module_winmine.base));
            },
            onError: (reason) => {
                console.log(reason);
            },
            onComplete: () => {
                console.log("Scan Complete!");
            }
        });
    }

    api_resolver() {
        let resolver = new ApiResolver("module");

        for (const iterator of resolver.enumerateMatches("exports:*!Stringf*/i")) {
            console.log(JSON.stringify(iterator));
        }

        for (const iterator of resolver.enumerateMatches("imports:winmine.exe!*w?r*")) {
            console.log(JSON.stringify(iterator));
        }

        //sections没效果
        // for (const iterator of resolver.enumerateMatches("sections:*.dll!*.text*")) {
        //     console.log(JSON.stringify(iterator));
        // }
    }
}

let shouldIntercept = true;

class HookUtils {
    hook() {
        this.hook_func_inter();
    }

    unhook() {
        shouldIntercept = false;
    }

    hook_func_inter() {
        let address = Module.getExportByName("ws2_32.dll", "connect");
        console.log("connect func address=", address);

        let listener = Interceptor.attach(address,{
            onEnter(this, args) {
                var sockaddr = args[1];
                // struct sockaddr {
                //     ushort  sa_family;
                //     char    sa_data[14];
                // };

                console.log("sa_family", sockaddr.readPointer());
                console.log("sa_data", sockaddr.add(2).readPointer());
            },
            onLeave(this, retval) {
                // 如果被拦截，返回错误，阻止连接
                if (shouldIntercept) {
                    console.log('Connection blocked!');
                    retval.replace(new NativePointer(-1));  // 设置为 -1 表示错误，阻止连接
                }
                else {
                    listener.detach();
                    console.log('connect : unhook');
                }   
            }
        })
    }
}

let hook = new HookUtils();

function exit()
{
    hook.unhook();
}

function main()
{
    ///DevTools里在这里下断点。然后主动调用main()即可断下
    //一旦import了多个模块之后，就无法直接试用main()执行了，会提示函数无法找到，此时需要用rpc.exports.main()
    ShowState();
/*
    console.log("AutoMineGame Start");
    let game = new AutoMineGame();
    game.visit_board(true);
    game.board_info();
    game.board_repaint();
    game.board_foreground();
    game.board_location();
    game.board_click();
    console.log("AutoMineGame End");
*/

/*
    console.log("HookMineGame Start");
    let hook = new HookMineGame();
    hook.memory_utils();
    hook.hook_func();
    hook.module_utils();
    hook.access_mon();
    hook.api_resolver();
    console.log("HookMineGame End");
*/

    //测试阻塞网络
    hook.hook();
}

//导出一个函数，方便我们主动调用，进行调试。
rpc.exports = {
    main: function () {
        main();
    },
    exit: function () {
        exit();
    },
  };


//
main()
console.log("Finish ");
