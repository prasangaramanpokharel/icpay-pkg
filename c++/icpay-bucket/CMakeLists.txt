cmake_minimum_required(VERSION 3.14)
project(icbucket_cpp CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(CURL REQUIRED)

include_directories(include ${CURL_INCLUDE_DIRS})

add_library(icbucket_cpp STATIC
    src/client.cpp
    src/files.cpp
    src/error.cpp
    src/url.cpp
)
target_link_libraries(icbucket_cpp PRIVATE ${CURL_LIBRARIES})

enable_testing()
add_executable(test_client test/test_client.cpp)
target_link_libraries(test_client PRIVATE icbucket_cpp ${CURL_LIBRARIES})
add_test(NAME test_client COMMAND test_client)
