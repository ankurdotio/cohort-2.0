import axios from 'axios';
import { tool } from "langchain"
import * as z from "zod";


export const listFiles = tool(
    async ({ }) => {
        console.log("=================================")
        console.log("using list files tool")
        console.log("=================================")

        const response = await axios.get("http://sandbox-service-019e2c5d-5741-73fe-91b5-2e86c7342fd4:3000/list-files")


        console.log("=================================")
        console.log("response from list files tool", response.data)
        console.log("=================================")

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({})
    }
)

export const readFiles = tool(
    async ({ files: [] }) => {

        console.log("=================================")
        console.log("using read files tool with files", files)
        console.log("=================================")

        const response = await axios.get("http://sandbox-service-019e2c5d-5741-73fe-91b5-2e86c7342fd4:3000/read-files?files=" + files.join(","))

        console.log("=================================")
        console.log("response from read files tool", response.data)
        console.log("=================================")
        return JSON.stringify(response.data);
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. This is useful for understanding the content of files that are relevant to the task at hand.",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files absolute paths to read. These should be files that were listed using the list_files tool or created later")
        })
    }
)

export const updateFiles = tool(
    async ({ files }) => {

        console.log("=================================")
        console.log("using update files tool with files", files)
        console.log("=================================")

        const response = await axios.patch("http://sandbox-service-019e2c5d-5741-73fe-91b5-2e86c7342fd4:3000/update-files", {
            updates: files
        })
        console.log("=================================")
        console.log("response from update files tool", response.data)
        console.log("=================================")

        return JSON.stringify(response.data.results);
    },
    {
        name: "update_files",
        description: "Update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
        schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The absolute path of the file to update"),
                content: z.string().describe("The new content for the file, the content should support json format.")
            })).describe("The list of files to update and their new contents")
        })
    }
)

