FROM strictlyskyler/meteor-environment:1.3.0
MAINTAINER Skyler Brungardt <skyler.brungardt@gmail.com>

ADD . /opt/harbormaster

WORKDIR /opt/harbormaster

RUN mkdir /harbormaster
RUN meteor --allow-superuser build /harbormaster --directory
RUN ln -s /opt/harbormaster/start.sh /start.sh

WORKDIR /harbormaster/bundle/programs/server
RUN npm install

VOLUME /root/.ssh

