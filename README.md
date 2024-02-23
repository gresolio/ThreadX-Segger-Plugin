## ThreadX RTOS awarennes plugin for Segger Studio

Segger Studio allows to use custom JavaScript program, so called "Threads Script" or Plugin, to show detailed information about the executing context via the Threads window:
**View --> More Debug Windows --> Threads (Ctrl+Alt+H).**

There are sample thread awareness scripts, located in the Segger Studio installation folder, Windows path example:
```
%ProgramFiles%\SEGGER\SEGGER Embedded Studio 8.10b\samples\
```

To use the thread awareness, set the path to the thread script in Project options --> Debug --> Threads Script File, <br> for example ```$(ProjectDir)/ThreadX_Plugin_CM0.js```

### References

* [Threads window. Writing the threads script](https://studio.segger.com/index.htm?https://studio.segger.com/ide_threads_window.htm)
* [Enable RTOS Awareness in Embedded Studio](https://wiki.segger.com/Enable_RTOS_Awareness_in_Embedded_Studio)
* [Ozone Manual --> 6.3 RTOS Awareness Plugin (page 227)](https://www.segger.com/downloads/jlink/UM08025_Ozone.pdf)
* [ThreadX RTOS](https://github.com/eclipse-threadx/threadx)
