package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "服务器运行正常！")
	})

	fmt.Println("Web 服务启动在 :8080")
	http.ListenAndServe(":8080", nil)
}
