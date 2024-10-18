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

function main()
{
    ///DevTools里在这里下断点。然后主动调用main()即可断下
    //一旦import了多个模块之后，就无法直接试用main()执行了，会提示函数无法找到，此时需要用rpc.exports.main()
    ShowState();

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