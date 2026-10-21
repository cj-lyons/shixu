Option Explicit
Dim shell, fso, root, status
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = root
status = shell.Run("node " & Chr(34) & root & "\scripts\launch-development.mjs" & Chr(34), 0, True)
If status <> 0 Then
 MsgBox "开发版启动失败。请查看日志：%APPDATA%\ShixuDevelopment\launcher.log", 48, "拾序·开发版"
End If
