安装依赖
npm install

设置自动编译
npm run watch

运行脚本
frida wechat.exe -l .\js\test.js

VSCode调试
- 直接F5只能调试原生ts
- 调试Frida调用的需要用chrome的DelTools工具进行的附加调试，用vscode编写TypeScript语言的Frida代码，并结合实时编译、DelTools工具自动监测脚本是否修改和Frida自动监测脚本是否修改的特性，可以达到比较理性的调试效果。
