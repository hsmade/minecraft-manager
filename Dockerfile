FROM python:3
COPY . /app/
WORKDIR /app
RUN pip install -r requirements.txt
RUN apt update && apt install -y screen apt-transport-https ca-certificates wget dirmngr gnupg software-properties-common
RUN wget -qO - https://adoptopenjdk.jfrog.io/adoptopenjdk/api/gpg/key/public | apt-key add -
RUN add-apt-repository --yes https://adoptopenjdk.jfrog.io/adoptopenjdk/deb/
RUN apt update && apt install -y adoptopenjdk-8-hotspot openjdk-17-jre-headless
RUN mkdir -p /usr/lib/jvm/java-1.8.0-openjdk-amd64/bin && ln -s /usr/lib/jvm/adoptopenjdk-8-hotspot-amd64/bin/java  /usr/lib/jvm/java-1.8.0-openjdk-amd64/bin/java
CMD ["python3", "./server.py"]
