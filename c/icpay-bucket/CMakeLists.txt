cmake_minimum_required(VERSION 3.12)
project(icbucket C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

find_package(CURL REQUIRED)

include_directories(include ${CURL_INCLUDE_DIRS})

add_library(icbucket STATIC
    src/icbucket.c
    src/url.c
    src/error.c
)
target_link_libraries(icbucket PRIVATE ${CURL_LIBRARIES})

enable_testing()
add_executable(test_icbucket test/test_icbucket.c)
target_link_libraries(test_icbucket PRIVATE icbucket ${CURL_LIBRARIES})
add_test(NAME test_icbucket COMMAND test_icbucket)
