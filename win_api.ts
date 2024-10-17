export class WinApi {
    private address_GetClientRect!: NativePointer | null;
    private address_InvalidateRect!: NativePointer | null;

    constructor() {
        this.address_GetClientRect = Module.findExportByName("User32.dll", "GetClientRect");
        this.address_InvalidateRect = Module.findExportByName("User32.dll", "InvalidateRect");
    }

    // BOOL GetClientRect(
    //     [in]  HWND   hWnd,
    //     [out] LPRECT lpRect
    // );
    GetClientRect(hWnd: NativePointerValue, lpRect: NativePointerValue): number {
        return new NativeFunction(this.address_GetClientRect!, "bool", ["pointer", "pointer"])
            (hWnd, lpRect);
    }

    // BOOL InvalidateRect(
    //     [in] HWND       hWnd,
    //     [in] const RECT * lpRect,
    //     [in] BOOL       bErase
    // );        
    InvalidateRect(hWnd: NativePointerValue, lpRect: NativePointerValue, bErase: number): number {
        return new NativeFunction(this.address_InvalidateRect!, "bool", ["pointer", "pointer", 'bool'])
            (hWnd, lpRect, bErase);
    }
}