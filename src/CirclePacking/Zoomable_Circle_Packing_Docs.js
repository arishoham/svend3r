
const dataSchema = "{\n      key1: \"parent-name\",\n      key2: [\n        {\n          key1: \"child-parent-name\",\n          key2: [\n            {\n              key1: \"child-child-parent-name\",\n              key2: [\n                { key1: \"child-child-child-child-name\", value1: \"value\" },\n                { key2: \"child-child-child-child-name\", value2: \"value\" },\n                { key3: \"child-child-child-child-name\", value3: \"value\" },\n                { key4: \"child-child-child-child-name\", value4: \"value\" },\n                //insert additional child objects\n              ]\n            },\n            //insert additional child objects\n          ]\n          //insert additional child arrays\n        },\n        //insert additional child objects\n      ]\n    }";


const pieChartDocs = [{"variable":"width","value":600,"dataType":"Number","description":"The outer width of the chart, in pixels.","defaultValue":600,"min":200,"max":1000},{"variable":"margin","value":20,"dataType":"Number","description":"The overall margin between the circle packs to the viewport edge.","defaultValue":20,"min":0,"max":50},{"variable":"backgroundColor","value":"transparent","dataType":"String | RGB | Hex","description":"The background color of the chart.","defaultValue":"transparent"},{"variable":"fontSize","value":15,"dataType":"Number","description":"The font size of the text labels.","defaultValue":15,"min":5,"max":30}];