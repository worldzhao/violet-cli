# violet

> 一个简单的模板管理工具

## 基本命令

```
violet init <project-name>                # 初始化项目
violet ls                                 # 查看模板列表
violet add <template-name> <template-git> # 增加模板
violet del <template-name>                # 删除模板
```

## 模板

### 静态模板

无法结合模板问答配置进行动态的模板，初始化此类模板 直接将模板仓库文件拷贝到本地项目

### 动态模板

基于 handlebars，支持模板问答配置`meta.js`，可根据用户数据动态渲染文件，具体编写规范后续给出。
