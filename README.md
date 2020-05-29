# babel-plugin-involve-export-default

Bind others exported objects with its self

## Install

Using npm:

```sh
npm install --save-dev babel-plugin-involve-export-default
```

How to use

```
{
  "plugins": [
    [
      "../babel-plugin-involve-export-default",
      {
        "relative": "./[name].involve",
        "exportName": "__involve"
      }
    ]
  ]
}
```