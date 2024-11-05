import { log } from "./logger";

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

function testCode() {
    const header = Memory.alloc(16);
    header
        .writeU32(0xdeadbeef).add(4)
        .writeU32(0xd00ff00d).add(4)
        .writeU64(uint64("0x1122334455667788"));
    log(hexdump(header.readByteArray(16) as ArrayBuffer, { ansi: true }));

    Process.getModuleByName("libUE4.so")
        .enumerateExports()
        .slice(0, 16)
        .forEach((exp, index) => {
            log(`export ${index}: ${exp.name}`);
        });

    let listener = Interceptor.attach(Module.getExportByName(null, "open"), {
        onEnter(this, args) {
            const path = args[0].readUtf8String();
            log(`open() path="${path}"`);
        },
        onLeave(this, retval) {
            log(`"open() ret=" ${retval}`);
            //加上这个，相当于只Hook一次
            listener.detach();
        },
    });

    let pattern = "C0 03 5F D6";    //ARM64  RET
    let ue_base = Process.getModuleByName("libUE4.so").base;
    Memory.scan(ue_base, Process.getModuleByName("libUE4.so").size, pattern, {
        onMatch: (address, size) => {
            console.log("onMatch", size, address, address.sub(ue_base));
        },
        onError: (reason) => {
            console.log(reason);
        },
        onComplete: () => {
            console.log("Scan Complete!");
        }
    });
}

function hexDump(baseAddr: NativePointer, size : number) {
    const endAddr = baseAddr.add(0x100);
    
    for (let addr = baseAddr; addr.compare(endAddr) < 0; addr = addr.add(4)) {
        const code = addr.readByteArray(16);
        log(hexdump(code as ArrayBuffer, { ansi: true }));
    }
}

function showAsm(start : NativePointer, length: number) {
    for (let index = 0; index < length; index++) {
        let inst = Instruction.parse(start);
        // console.log(JSON.stringify(inst));
        let byteArray = start.readByteArray(inst.size);
        let byteCode = Array.prototype.slice.call(new Uint8Array(byteArray as ArrayBuffer));
        let mCode = byteCode.map(x => x.toString(16).padStart(2, "0")).join(" ").toUpperCase();
        console.log(inst.address.toString().toUpperCase().replace("0X", "0x"), mCode.padEnd(14, " "), "\t", inst.toString().toUpperCase().replace("0X", "0x"));

        start = inst.next;
        if (start.readU32() == 0) break;
    }
}

function main()
{
    ///DevTools里在这里下断点。然后主动调用main()即可断下
    //一旦import了多个模块之后，就无法直接试用main()执行了，会提示函数无法找到，此时需要用rpc.exports.main()
    ShowState();

    
    let ue_base : NativePointer  = Process.getModuleByName("libUE4.so").base;
    let ue_size : number = Process.getModuleByName("libUE4.so").size;

    //安卓可以用，搜索so的text段
    let resolver = new ApiResolver("module");
    for (const iterator of resolver.enumerateMatches("sections:libUE4.so!*text*")) {
        console.log(JSON.stringify(iterator));
        ue_base = iterator.address;
        ue_size = iterator.size!;
    }

    //hexDump(ue_base, ue_size);

    showAsm(ue_base, ue_size);
    log(`searchJumps finish`);

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