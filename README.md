安装依赖
```sh
npm install
```

编译,以及自动编译
```sh
npm run watch
```

运行脚本
```sh
frida wechat.exe -l .\test.js
```

VSCode调试
- 直接F5只能调试原生ts
- 调试Frida调用的需要用chrome的DelTools工具进行的附加调试.

启动
```sh
frida winmine.exe --debug --runtime=v8 -l .\test.js
```

断点
```sh

function main()
{
    console.log("Start");
    //xxx
}

//导出一个函数，方便我们主动调用，进行调试。
//DevTools里在这里下断点。然后主动调用 main() 即可断下
//一旦import了多个模块之后，就无法直接试用main()执行了，会提示函数无法找到，此时需要用rpc.exports.main()

rpc.exports = {
    main: function () {
        main();
    },
  };
  
```
